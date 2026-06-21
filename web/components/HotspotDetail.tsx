"use client";

import type { Hotspot, Place } from "@/lib/types";
import { HourSpark, BarList } from "./Sparkline";

function tier(impact: number) {
  if (impact >= 60) return { label: "High impact", color: "var(--high)" };
  if (impact >= 40) return { label: "Medium impact", color: "var(--med)" };
  return { label: "Low impact", color: "var(--low)" };
}

export default function HotspotDetail({
  h,
  rank,
  place,
  onBack,
  onMethodology,
}: {
  h: Hotspot;
  rank: number;
  place?: Place;
  onBack: () => void;
  onMethodology: () => void;
}) {
  const t = tier(h.impact);
  const peakHour = h.hours.indexOf(Math.max(...h.hours));
  const vTotal = h.violations.reduce((s, [, c]) => s + c, 0);
  const carTotal = h.vehicles.reduce((s, [, c]) => s + c, 0);

  return (
    <>
      <div className="dt-top">
        <div>
          <div className="dt-kicker">
            <span className="dot" style={{ background: t.color, boxShadow: `0 0 10px ${t.color}` }} />
            <span className="lab" style={{ color: t.color }}>
              {t.label} · Rank #{rank}
            </span>
          </div>
          <div className="dt-name">{h.station}</div>
        </div>
        <button className="dt-x" onClick={onBack} aria-label="close">
          ×
        </button>
      </div>

      {place?.locality && (
        <div className="dt-locality" title="Nearest place — Mappls partner data">
          <span className="pin">◎</span> {place.locality}
          <span className="src">Mappls</span>
        </div>
      )}

      <div className="dt-hero">
        <span className="num" style={{ color: t.color }}>
          {h.impact.toFixed(1)}
        </span>
        <span className="lab">Impact score</span>
      </div>

      <div className="dt-strip">
        <div className="dt-cell">
          <div className="v">{h.n.toLocaleString()}</div>
          <div className="k">Violations</div>
        </div>
        <div className="dt-cell">
          <div className="v">{h.severity.toFixed(2)}</div>
          <div className="k">Severity</div>
        </div>
        <div className="dt-cell">
          <div className="v">{h.persistence}%</div>
          <div className="k">Days</div>
        </div>
      </div>

      <div className="dt-block">
        <div className="dt-block-t">
          Why it scores high
          <button
            className="info-dot"
            onClick={onMethodology}
            aria-label="How the impact score is calculated"
            title="How the impact score is calculated"
          >
            ⓘ
          </button>
        </div>
        <div className="bar-list">
          <div className="bar-item">
            <div className="top">
              <span>Near junction</span>
              <span>{Math.round(h.junctionShare * 100)}%</span>
            </div>
            <div className="bar-track">
              <i style={{ width: `${Math.round(h.junctionShare * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="dt-block">
        <div className="dt-block-t">
          When it happens <span>peak {String(peakHour).padStart(2, "0")}:00</span>
        </div>
        <HourSpark hours={h.hours} />
      </div>

      <div className="dt-block">
        <div className="dt-block-t">Top violation types</div>
        <BarList items={h.violations} total={vTotal} />
      </div>

      <div className="dt-block">
        <div className="dt-block-t">Offending vehicles</div>
        <BarList items={h.vehicles} total={carTotal} />
      </div>

      <div className="dt-action">
        Deploy enforcement at <b>{h.station}</b> beat around{" "}
        <b className="accent">{String(peakHour).padStart(2, "0")}:00</b>. Target{" "}
        <b>{h.violations[0][0].toLowerCase()}</b> by{" "}
        <b>{h.vehicles[0][0].toLowerCase()}</b>s — the dominant pattern in this
        180m cell.
        {h.junctionShare >= 0.6
          ? " Junction-adjacent: clearing this cell directly relieves signal back-up."
          : ""}
      </div>
    </>
  );
}
