"""
GridSense — Round 2 data pipeline (Theme 1: Parking-Induced Congestion)

Reads the raw BTP parking-violation dump and precomputes everything the
dashboard needs into small static JSON files. The frontend never touches the
298k-row CSV; it just loads these.

Outputs (web/public/data/):
  meta.json       city-level stats: totals, date range, violation/vehicle mix,
                  hour-of-day curve
  hotspots.json   aggregated ~180m grid cells with a congestion-impact score
  heat.json       compact [lon, lat, weight] points for the deck.gl heat layer
  stations.json   per police-station rollups + enforcement priority windows

Impact note: this dataset has no traffic-flow / speed signal, and external data
is disallowed, so "impact on traffic flow" is a *derived proxy*:
    impact = volume x severity x persistence x junction-proximity
all explainable from the violations themselves.
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
OUT.mkdir(parents=True, exist_ok=True)

# ~180m grid. At Bengaluru's latitude 0.0016 deg is roughly 180m both ways.
CELL = 0.0016
MIN_CELL_COUNT = 4          # a "hotspot" needs at least this many violations
LAT_LO, LAT_HI = 12.7, 13.4  # clip a handful of stray/garbage coordinates
LON_LO, LON_HI = 77.3, 77.9

# Congestion severity per violation label (1 = minor, 5 = directly chokes flow).
# Identity/fare offences that don't affect carriageway get a 1.
SEVERITY = {
    "PARKING IN A MAIN ROAD": 5,
    "PARKING NEAR ROAD CROSSING": 5,
    "PARKING NEAR TRAFFIC LIGHT OR ZEBRA CROSS": 5,
    "DOUBLE PARKING": 5,
    "PARKING ON FOOTPATH": 4,
    "PARKING NEAR BUSTOP/SCHOOL/HOSPITAL ETC": 4,
    "PARKING OPPOSITE TO ANOTHER PARKED VEHICLE": 4,
    "AGAINST ONE WAY/NO ENTRY": 4,
    "WRONG PARKING": 3,
    "PARKING OTHER THAN BUS STOP": 3,
    "VIOLATING LANE DISIPLINE": 3,
    "OBSTRUCTING DRIVER": 3,
    "H T V PROHIBITED": 3,
    "NO PARKING": 2,
    "REFUSE TO GO FOR HIRE": 1,
    "DEMANDING EXCESS FARE": 1,
    "DEFECTIVE NUMBER PLATE": 1,
    "USING BLACK FILM/OTHER MATERIALS": 1,
    "WITHOUT SIDE MIRROR": 1,
    "FAIL TO USE SAFETY BELTS": 1,
}
DEFAULT_SEVERITY = 2


def parse_violations(val):
    """violation_type is a JSON-ish array string like ["WRONG PARKING","NO PARKING"]."""
    if not isinstance(val, str):
        return []
    try:
        out = ast.literal_eval(val)
        return [str(x).strip() for x in out] if isinstance(out, list) else [str(out)]
    except Exception:
        return [val.strip()]


def main():
    print("loading", SRC)
    df = pd.read_csv(
        SRC,
        low_memory=False,
        usecols=[
            "latitude", "longitude", "violation_type", "vehicle_type",
            "police_station", "junction_name", "created_datetime",
        ],
    )
    print("  rows:", len(df))

    # --- clean ----------------------------------------------------------------
    df = df[
        df.latitude.between(LAT_LO, LAT_HI) & df.longitude.between(LON_LO, LON_HI)
    ].copy()
    ts = pd.to_datetime(df.created_datetime, errors="coerce", utc=True).dt.tz_convert("Asia/Kolkata")
    df["hour"] = ts.dt.hour
    df["date"] = ts.dt.date
    df["dow"] = ts.dt.dayofweek
    span_days = max((ts.max() - ts.min()).days, 1)
    print("  clean rows:", len(df), "| span days:", span_days)

    # explode violation labels so each row can have several
    df["labels"] = df.violation_type.map(parse_violations)
    df["severity"] = df.labels.map(
        lambda ls: max((SEVERITY.get(l, DEFAULT_SEVERITY) for l in ls), default=DEFAULT_SEVERITY)
    )
    df["is_junction"] = (df.junction_name.fillna("No Junction") != "No Junction")

    unmapped = {l for ls in df.labels for l in ls} - set(SEVERITY)
    if unmapped:
        print("  NOTE unmapped labels (default severity):", sorted(unmapped))

    # --- grid cells -----------------------------------------------------------
    df["cx"] = np.floor(df.longitude / CELL).astype(int)
    df["cy"] = np.floor(df.latitude / CELL).astype(int)

    g = df.groupby(["cx", "cy"])
    cells = g.agg(
        n=("severity", "size"),
        sev=("severity", "mean"),
        active_days=("date", "nunique"),
        junction_share=("is_junction", "mean"),
        lat=("latitude", "mean"),
        lon=("longitude", "mean"),
    ).reset_index()

    # --- congestion-impact score (0..100) ------------------------------------
    vol_c = np.log1p(cells.n) / math.log1p(cells.n.max())
    sev_c = (cells.sev - 1) / 4.0
    per_c = np.minimum(cells.active_days / span_days, 1.0)
    jun_c = cells.junction_share
    cells["impact"] = (
        100.0 * (0.40 * vol_c + 0.30 * sev_c + 0.20 * per_c + 0.10 * jun_c)
    ).round(1)
    cells["persistence"] = (per_c * 100).round(0).astype(int)

    # --- per-cell breakdowns for the detail panel (hotspots only) ------------
    hot = cells[cells.n >= MIN_CELL_COUNT].sort_values("impact", ascending=False).copy()
    print("  cells:", len(cells), "| hotspots(>=%d):" % MIN_CELL_COUNT, len(hot))

    df["cellkey"] = list(zip(df.cx, df.cy))
    hotkeys = set(zip(hot.cx, hot.cy))
    sub = df[df.cellkey.isin(hotkeys)]

    # dominant violation label, vehicle mix, hour curve, station per hot cell
    viol_rows = sub.explode("labels")
    top_viol = (
        viol_rows.groupby(["cellkey", "labels"]).size()
        .groupby(level=0, group_keys=False).nlargest(4)
    )
    veh = (
        sub.groupby(["cellkey", "vehicle_type"]).size()
        .groupby(level=0, group_keys=False).nlargest(4)
    )
    hours = sub.groupby(["cellkey", "hour"]).size()
    station = sub.groupby("cellkey").police_station.agg(
        lambda s: s.value_counts().index[0]
    )

    def viol_for(k):
        try:
            return [[lbl, int(c)] for (kk, lbl), c in top_viol.items() if kk == k]
        except Exception:
            return []

    # index helpers (faster than filtering each time)
    tv = {k: [] for k in hotkeys}
    for (k, lbl), c in top_viol.items():
        tv[k].append([lbl, int(c)])
    vm = {k: [] for k in hotkeys}
    for (k, vt), c in veh.items():
        vm[k].append([str(vt), int(c)])
    hr = {k: [0] * 24 for k in hotkeys}
    for (k, h), c in hours.items():
        if not math.isnan(h):
            hr[k][int(h)] = int(c)

    hotspots = []
    for i, row in enumerate(hot.itertuples(index=False)):
        k = (row.cx, row.cy)
        hotspots.append({
            "id": i,
            "lat": round(row.lat, 6),
            "lon": round(row.lon, 6),
            "n": int(row.n),
            "impact": float(row.impact),
            "severity": round(float(row.sev), 2),
            "persistence": int(row.persistence),
            "junctionShare": round(float(row.junction_share), 2),
            "station": str(station.get(k, "Unknown")),
            "violations": tv.get(k, []),
            "vehicles": vm.get(k, []),
            "hours": hr.get(k, [0] * 24),
        })

    # --- heat layer: every cell as [lon, lat, weight] (compact) --------------
    heat = [[round(float(r.lon), 5), round(float(r.lat), 5), int(r.n)]
            for r in cells.itertuples(index=False)]

    # --- station rollups + enforcement priority ------------------------------
    st = df.groupby("police_station").agg(
        n=("severity", "size"),
        sev=("severity", "mean"),
        junction_share=("is_junction", "mean"),
    ).reset_index()
    # map each station to mean impact of its hot cells
    cell_station = df.groupby("cellkey").police_station.agg(lambda s: s.value_counts().index[0])
    hot_imp = dict(zip(zip(hot.cx, hot.cy), hot.impact))
    st_impact, st_peak = {}, {}
    for stn, grp in df.groupby("police_station"):
        keys = set(grp.cellkey) & hotkeys
        imps = [hot_imp[k] for k in keys if k in hot_imp]
        st_impact[stn] = round(float(np.mean(imps)), 1) if imps else 0.0
        hourly = grp.hour.value_counts()
        st_peak[stn] = int(hourly.index[0]) if len(hourly) else -1
    st["impact"] = st.police_station.map(st_impact)
    st["peak_hour"] = st.police_station.map(st_peak)
    st["hot_cells"] = st.police_station.map(
        lambda s: sum(1 for k in hotkeys if cell_station.get(k) == s)
    )
    st = st.sort_values("impact", ascending=False)
    stations = [{
        "name": str(r.police_station),
        "n": int(r.n),
        "impact": float(r.impact),
        "severity": round(float(r.sev), 2),
        "hotCells": int(r.hot_cells),
        "peakHour": int(r.peak_hour),
        "junctionShare": round(float(r.junction_share), 2),
    } for r in st.itertuples(index=False)]

    # --- meta -----------------------------------------------------------------
    viol_totals = (
        df.explode("labels").labels.value_counts().head(15)
    )
    veh_totals = df.vehicle_type.value_counts().head(12)
    hour_curve = df.hour.value_counts().sort_index()
    dow_curve = df.dow.value_counts().sort_index()
    meta = {
        "records": int(len(df)),
        "hotspots": int(len(hot)),
        "cells": int(len(cells)),
        "stations": int(df.police_station.nunique()),
        "dateStart": str(ts.min().date()),
        "dateEnd": str(ts.max().date()),
        "spanDays": int(span_days),
        "bbox": [LON_LO, LAT_LO, LON_HI, LAT_HI],
        "center": [round(float(df.longitude.median()), 5), round(float(df.latitude.median()), 5)],
        "violationTotals": [[k, int(v)] for k, v in viol_totals.items()],
        "vehicleTotals": [[str(k), int(v)] for k, v in veh_totals.items()],
        "hourCurve": [int(hour_curve.get(h, 0)) for h in range(24)],
        "dowCurve": [int(dow_curve.get(d, 0)) for d in range(7)],
        "topImpact": float(hot.impact.max()),
    }

    # --- write ----------------------------------------------------------------
    for name, obj in [
        ("meta.json", meta),
        ("hotspots.json", hotspots),
        ("heat.json", heat),
        ("stations.json", stations),
    ]:
        p = OUT / name
        p.write_text(json.dumps(obj, separators=(",", ":")))
        print(f"  wrote {name:16s} {p.stat().st_size/1024:8.1f} KB")

    print("done.")


if __name__ == "__main__":
    main()
