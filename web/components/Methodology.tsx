"use client";

import { useMemo } from "react";
import type { Meta, Hotspot } from "@/lib/types";

const SEVERITY_SCALE: [string, number][] = [
  ["Parking in main road · near crossing · near signal · double parking", 5],
  ["On footpath · near bus-stop/school/hospital · against one-way", 4],
  ["Wrong parking · obstructing · lane indiscipline · HTV prohibited", 3],
  ["No parking", 2],
  ["Non-carriageway offences (fare, number plate, seat-belt…)", 1],
];

const FACTORS = [
  {
    key: "volume",
    label: "Volume",
    weight: 0.4,
    color: "var(--amber)",
    norm: "log(1+n) ÷ log(1+max)",
    blurb:
      "How many violations the cell absorbs over 5 months. Log-scaled so one runaway hotspot doesn't flatten everything else.",
  },
  {
    key: "severity",
    label: "Severity",
    weight: 0.3,
    color: "var(--warm)",
    norm: "(severity − 1) ÷ 4",
    blurb:
      "How much the offence actually chokes the carriageway. Parking in a main road or on a crossing scores 5; a defective number plate scores 1.",
  },
  {
    key: "persistence",
    label: "Persistence",
    weight: 0.2,
    color: "var(--blue)",
    norm: "active days ÷ span",
    blurb:
      "Is it a chronic chokepoint or a one-off? Share of the 150-day window on which the cell saw a violation.",
  },
  {
    key: "junction",
    label: "Junction proximity",
    weight: 0.1,
    color: "var(--cool)",
    norm: "share near a junction",
    blurb:
      "Blocking near a junction backs up a whole signal cycle, so junction-adjacent cells carry extra weight.",
  },
] as const;

export default function Methodology({
  meta,
  hotspots,
  onClose,
}: {
  meta: Meta;
  hotspots: Hotspot[];
  onClose: () => void;
}) {
  // live worked example on the #1 cell — reconstructs the exact pipeline formula
  const example = useMemo(() => {
    const h = hotspots[0];
    if (!h) return null;
    const maxN = hotspots.reduce((m, x) => Math.max(m, x.n), 0);
    const vol = Math.log1p(h.n) / Math.log1p(maxN);
    const sev = (h.severity - 1) / 4;
    const per = h.persistence / 100;
    const jun = h.junctionShare;
    const parts = {
      volume: 100 * 0.4 * vol,
      severity: 100 * 0.3 * sev,
      persistence: 100 * 0.2 * per,
      junction: 100 * 0.1 * jun,
    };
    const raw: Record<string, string> = {
      volume: `${h.n.toLocaleString()} viol`,
      severity: `${h.severity.toFixed(2)} / 5`,
      persistence: `${h.persistence}% of days`,
      junction: `${Math.round(h.junctionShare * 100)}% near jn`,
    };
    const total = parts.volume + parts.severity + parts.persistence + parts.junction;
    return { h, parts, raw, total };
  }, [hotspots]);

  return (
    <div className="msheet-backdrop" onClick={onClose}>
      <aside className="msheet" onClick={(e) => e.stopPropagation()}>
        <div className="msheet-head">
          <div>
            <div className="msheet-eyebrow">Methodology</div>
            <h2>The Congestion Impact Score</h2>
          </div>
          <button className="msheet-x" onClick={onClose} aria-label="close">
            ✕
          </button>
        </div>

        <div className="msheet-scroll">
          <section className="mblock">
            <p className="mlede">
              The dataset records <b>where</b> people park illegally — not how
              traffic flows. There is no speed or volume feed, and external data
              is off-limits. So we don&apos;t claim to measure congestion
              directly; we <b>derive a proxy</b> for it from four signals already
              inside the {meta.records.toLocaleString()} records.
            </p>
          </section>

          <section className="mblock">
            <div className="mformula">
              impact = 100 × ( 0.40·volume + 0.30·severity + 0.20·persistence +
              0.10·junction )
            </div>
            <p className="mnote">
              Each factor is normalised to 0–1 across all {meta.cells.toLocaleString()}{" "}
              cells, then weighted. Result is a single 0–100 score that ranks
              every 180-metre cell by how much it plausibly hurts flow.
            </p>
          </section>

          <section className="mblock">
            <div className="mtitle">The four factors</div>
            {FACTORS.map((f) => (
              <div className="mfactor" key={f.key}>
                <div className="mfactor-top">
                  <span className="mdot" style={{ background: f.color }} />
                  <span className="mfactor-name">{f.label}</span>
                  <span className="mweight">{Math.round(f.weight * 100)}%</span>
                </div>
                <div className="mfactor-norm">{f.norm}</div>
                <p className="mfactor-blurb">{f.blurb}</p>
              </div>
            ))}
          </section>

          {example && (
            <section className="mblock">
              <div className="mtitle">
                Worked example <span>{example.h.station}</span>
              </div>
              <p className="mnote">
                The city&apos;s #1 cell scores{" "}
                <b>{example.h.impact.toFixed(1)}</b>. Here is exactly where that
                number comes from — same arithmetic the pipeline runs:
              </p>

              <div className="mstack">
                {FACTORS.map((f) => {
                  const pts = example.parts[f.key as keyof typeof example.parts];
                  return (
                    <i
                      key={f.key}
                      style={{
                        width: `${(pts / 100) * 100}%`,
                        background: f.color,
                      }}
                      title={`${f.label}: +${pts.toFixed(1)}`}
                    />
                  );
                })}
              </div>

              <div className="mrows">
                {FACTORS.map((f) => {
                  const pts = example.parts[f.key as keyof typeof example.parts];
                  return (
                    <div className="mrow" key={f.key}>
                      <span className="mrow-dot" style={{ background: f.color }} />
                      <span className="mrow-name">{f.label}</span>
                      <span className="mrow-raw">
                        {example.raw[f.key]}
                      </span>
                      <span className="mrow-pts">+{pts.toFixed(1)}</span>
                    </div>
                  );
                })}
                <div className="mrow mrow-total">
                  <span className="mrow-dot" style={{ background: "transparent" }} />
                  <span className="mrow-name">Impact score</span>
                  <span className="mrow-raw" />
                  <span className="mrow-pts">{example.total.toFixed(1)}</span>
                </div>
              </div>
            </section>
          )}

          <section className="mblock">
            <div className="mtitle">Severity scale</div>
            <p className="mnote">
              Each violation label is hand-mapped to how directly it blocks the
              carriageway. A cell inherits the worst label seen there.
            </p>
            <div className="msev">
              {SEVERITY_SCALE.map(([label, n]) => (
                <div className="msev-row" key={n}>
                  <span className={`msev-pill sev-${n}`}>{n}</span>
                  <span className="msev-label">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="mblock">
            <div className="mtitle">Provenance</div>
            <div className="mprov">
              <div>
                <b>{meta.records.toLocaleString()}</b> geotagged violations
              </div>
              <div>
                <b>
                  {meta.dateStart} → {meta.dateEnd}
                </b>{" "}
                · {meta.spanDays} days
              </div>
              <div>
                <b>{meta.stations}</b> police beats · <b>{meta.cells.toLocaleString()}</b>{" "}
                grid cells
              </div>
              <div className="mprov-flag">
                Single source: the official challenge dataset. No external data,
                no live feeds — fully reproducible offline.
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
