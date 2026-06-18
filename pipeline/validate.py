"""
Kerbline — validation pass for the Congestion Impact Score.

The dataset has no traffic-flow / speed ground truth and external data is
disallowed, so we cannot validate the score against "real" congestion directly.
What we CAN do — and what a serious reviewer should demand — is show the score
is not arbitrary. This script runs four fully-internal, dataset-only checks and
writes web/public/data/validation.json for the in-app Methodology panel:

  1. WEIGHT ROBUSTNESS   The exact weights (0.40/0.30/0.20/0.10) are a judgment
     call. We perturb them 2,000 times (+-50% each, renormalised) and measure
     how much the hotspot ranking moves. If the top hotspots barely change, the
     precise weights don't matter — the signal does. Defuses "your weights are
     made up."

  2. TEMPORAL STABILITY  Split the 6 months in half by date, score each half
     independently, and compare. If a cell is a hotspot in Nov-Jan it should
     still be one in Feb-Apr. Recurrence = signal, not noise. Defuses "you're
     fitting noise."

  3. CONVERGENT VALIDITY We hold out a signal the score never uses — the number
     of DISTINCT violation types a cell attracts — and check it tracks impact.
     A genuine chokepoint draws varied violations; a quiet street doesn't.
     Agreement with a feature we didn't engineer in is independent support.

  4. CONCENTRATION       Gini + Lorenz of violations across cells. Quantifies
     the core enforcement claim: a small fraction of cells holds most of the
     problem, so a handful of roving teams can move the needle.

Every number below is reproducible from Dataset.csv alone.
"""

import json
import math
import ast
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "Dataset.csv"
OUT = ROOT / "web" / "public" / "data"

# keep these identical to build_data.py
CELL = 0.0016
MIN_CELL_COUNT = 4
LAT_LO, LAT_HI = 12.7, 13.4
LON_LO, LON_HI = 77.3, 77.9
W = dict(volume=0.40, severity=0.30, persistence=0.20, junction=0.10)

SEVERITY = {
    "PARKING IN A MAIN ROAD": 5, "PARKING NEAR ROAD CROSSING": 5,
    "PARKING NEAR TRAFFIC LIGHT OR ZEBRA CROSS": 5, "DOUBLE PARKING": 5,
    "PARKING ON FOOTPATH": 4, "PARKING NEAR BUSTOP/SCHOOL/HOSPITAL ETC": 4,
    "PARKING OPPOSITE TO ANOTHER PARKED VEHICLE": 4, "AGAINST ONE WAY/NO ENTRY": 4,
    "WRONG PARKING": 3, "PARKING OTHER THAN BUS STOP": 3,
    "VIOLATING LANE DISIPLINE": 3, "OBSTRUCTING DRIVER": 3, "H T V PROHIBITED": 3,
    "NO PARKING": 2, "REFUSE TO GO FOR HIRE": 1, "DEMANDING EXCESS FARE": 1,
    "DEFECTIVE NUMBER PLATE": 1, "USING BLACK FILM/OTHER MATERIALS": 1,
    "WITHOUT SIDE MIRROR": 1, "FAIL TO USE SAFETY BELTS": 1,
}
DEFAULT_SEVERITY = 2


def parse_violations(val):
    if not isinstance(val, str):
        return []
    try:
        out = ast.literal_eval(val)
        return [str(x).strip() for x in out] if isinstance(out, list) else [str(out)]
    except Exception:
        return [val.strip()]


def score(cells, span_days, w=W):
    """Recompute the 0..100 impact score for a cell table. Mirrors build_data.py."""
    n = cells["n"].to_numpy()
    vol_c = np.log1p(n) / math.log1p(n.max())
    sev_c = (cells["sev"].to_numpy() - 1) / 4.0
    per_c = np.minimum(cells["active_days"].to_numpy() / span_days, 1.0)
    jun_c = cells["junction_share"].to_numpy()
    return 100.0 * (w["volume"] * vol_c + w["severity"] * sev_c
                    + w["persistence"] * per_c + w["junction"] * jun_c)


def cell_table(df, span_days):
    g = df.groupby(["cx", "cy"])
    cells = g.agg(
        n=("severity", "size"),
        sev=("severity", "mean"),
        active_days=("date", "nunique"),
        junction_share=("is_junction", "mean"),
        distinct_viol=("nlabels_set", "max"),  # placeholder, overwritten below
    ).reset_index()
    # distinct violation labels per cell (held-out convergent signal)
    dv = df.explode("labels").groupby(["cx", "cy"]).labels.nunique()
    cells["distinct_viol"] = cells.set_index(["cx", "cy"]).index.map(dv).astype(float)
    return cells


def spearman(a, b):
    return float(pd.Series(a).corr(pd.Series(b), method="spearman"))


def topset(cells, score_col, k):
    return set(cells.sort_values(score_col, ascending=False).head(k).index)


def main():
    rng = np.random.default_rng(42)
    print("loading", SRC)
    df = pd.read_csv(SRC, low_memory=False, usecols=[
        "latitude", "longitude", "violation_type", "vehicle_type",
        "police_station", "junction_name", "created_datetime"])

    df = df[df.latitude.between(LAT_LO, LAT_HI)
            & df.longitude.between(LON_LO, LON_HI)].copy()
    ts = pd.to_datetime(df.created_datetime, errors="coerce", utc=True).dt.tz_convert("Asia/Kolkata")
    df["date"] = ts.dt.date
    span_days = max((ts.max() - ts.min()).days, 1)
    df["labels"] = df.violation_type.map(parse_violations)
    df["severity"] = df.labels.map(
        lambda ls: max((SEVERITY.get(l, DEFAULT_SEVERITY) for l in ls), default=DEFAULT_SEVERITY))
    df["is_junction"] = (df.junction_name.fillna("No Junction") != "No Junction")
    df["nlabels_set"] = 0
    df["cx"] = np.floor(df.longitude / CELL).astype(int)
    df["cy"] = np.floor(df.latitude / CELL).astype(int)

    cells = cell_table(df, span_days)
    cells["impact"] = score(cells, span_days)
    hot = cells[cells.n >= MIN_CELL_COUNT].reset_index(drop=True)
    K = min(20, len(hot))
    base_rank = hot["impact"].rank(ascending=False)
    base_top = topset(hot, "impact", K)
    print(f"  hotspot cells: {len(hot)} | evaluating top-{K} stability")

    # --- 1. weight robustness ------------------------------------------------
    DRAWS = 2000
    spear, overlap = [], []
    keys = ["volume", "severity", "persistence", "junction"]
    base = np.array([W[k] for k in keys])
    for _ in range(DRAWS):
        pert = base * rng.uniform(0.5, 1.5, size=4)
        pert /= pert.sum()
        w = dict(zip(keys, pert))
        s = score(hot, span_days, w)
        spear.append(spearman(base_rank, pd.Series(s).rank(ascending=False)))
        top = set(pd.Series(s, index=hot.index).sort_values(ascending=False).head(K).index)
        overlap.append(len(top & base_top) / K)
    # two named extreme reweightings
    s_equal = score(hot, span_days, dict(volume=.25, severity=.25, persistence=.25, junction=.25))
    s_volonly = score(hot, span_days, dict(volume=1.0, severity=0, persistence=0, junction=0))
    weight = {
        "draws": DRAWS,
        "perturbation": "+-50% per weight, renormalised",
        "spearmanMedian": round(float(np.median(spear)), 3),
        "spearmanP05": round(float(np.percentile(spear, 5)), 3),
        "top20OverlapMedian": round(float(np.median(overlap)), 3),
        "top20OverlapMin": round(float(np.min(overlap)), 3),
        "spearmanEqualWeights": round(spearman(base_rank, pd.Series(s_equal).rank(ascending=False)), 3),
        "spearmanVolumeOnly": round(spearman(base_rank, pd.Series(s_volonly).rank(ascending=False)), 3),
        "topK": K,
    }
    print("  [1] weight robustness:", weight["spearmanMedian"], "median rho,",
          weight["top20OverlapMedian"], "top-K overlap")

    # --- 2. temporal stability ----------------------------------------------
    mid = sorted(df["date"].dropna().unique())[len(df["date"].dropna().unique()) // 2]
    h1 = df[df["date"] < mid]
    h2 = df[df["date"] >= mid]
    sd1 = max((pd.to_datetime(pd.Series(list(h1["date"]))).max()
               - pd.to_datetime(pd.Series(list(h1["date"]))).min()).days, 1)
    sd2 = max((pd.to_datetime(pd.Series(list(h2["date"]))).max()
               - pd.to_datetime(pd.Series(list(h2["date"]))).min()).days, 1)
    c1 = cell_table(h1, sd1); c1["impact"] = score(c1, sd1)
    c2 = cell_table(h2, sd2); c2["impact"] = score(c2, sd2)
    c1 = c1[c1.n >= MIN_CELL_COUNT].set_index(["cx", "cy"])
    c2 = c2[c2.n >= MIN_CELL_COUNT].set_index(["cx", "cy"])
    common = c1.index.intersection(c2.index)
    rho_t = spearman(c1.loc[common, "impact"], c2.loc[common, "impact"])
    kt = min(20, len(c1), len(c2))
    t1 = set(c1["impact"].sort_values(ascending=False).head(kt).index)
    t2 = set(c2["impact"].sort_values(ascending=False).head(kt).index)
    temporal = {
        "splitDate": str(mid),
        "cellsHalf1": int(len(c1)),
        "cellsHalf2": int(len(c2)),
        "commonCells": int(len(common)),
        "spearman": round(rho_t, 3),
        "topKOverlap": round(len(t1 & t2) / kt, 3),
        "topK": int(kt),
    }
    print("  [2] temporal stability:", temporal["spearman"], "rho,",
          temporal["topKOverlap"], "top-K recur")

    # --- 3. convergent validity (held-out signal) ---------------------------
    rho_c = spearman(hot["impact"], hot["distinct_viol"])
    convergent = {
        "heldOutSignal": "distinct violation types per cell",
        "spearman": round(rho_c, 3),
        "note": "signal never used in the score; positive agreement is independent support",
    }
    print("  [3] convergent validity:", convergent["spearman"], "rho vs held-out signal")

    # --- 4. concentration ----------------------------------------------------
    counts = np.sort(cells["n"].to_numpy())
    cum = np.cumsum(counts)
    gini = float((2 * np.sum((np.arange(1, len(counts) + 1)) * counts))
                 / (len(counts) * cum[-1]) - (len(counts) + 1) / len(counts))
    order = np.sort(cells["n"].to_numpy())[::-1]
    tot = order.sum()
    top5_share = float(order[:max(1, int(len(order) * 0.05))].sum() / tot)
    top1_share = float(order[:max(1, int(len(order) * 0.01))].sum() / tot)
    # cells needed to cover 50% of all violations
    cov = np.cumsum(order) / tot
    cells_for_half = int(np.searchsorted(cov, 0.5) + 1)
    concentration = {
        "gini": round(gini, 3),
        "top5PctShare": round(top5_share, 3),
        "top1PctShare": round(top1_share, 3),
        "cellsForHalf": cells_for_half,
        "totalCells": int(len(cells)),
        "cellsForHalfPct": round(100 * cells_for_half / len(cells), 1),
    }
    print("  [4] concentration: gini", concentration["gini"],
          "| top5% holds", concentration["top5PctShare"])

    out = {
        "generated": "validate.py",
        "weightRobustness": weight,
        "temporalStability": temporal,
        "convergentValidity": convergent,
        "concentration": concentration,
    }
    p = OUT / "validation.json"
    p.write_text(json.dumps(out, separators=(",", ":")))
    print(f"  wrote {p.name} {p.stat().st_size/1024:.1f} KB")
    print("done.")


if __name__ == "__main__":
    main()
