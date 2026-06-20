"use client";

import type { Hotspot, Place } from "@/lib/types";
import { HourSpark, BarList } from "./Sparkline";

function tier(impact: number) {
  if (impact >= 60) return { label: "Critical", color: "var(--hot)" };
  if (impact >= 40) return { label: "High", color: "var(--warm)" };
  if (impact >= 22) return { label: "Moderate", color: "var(--amber)" };
  return { label: "Watch", color: "var(--cool)" };
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
      <div className="detail-head">
        <button className="back" onClick={onBack}>
          ← Priority board
        </button>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 12 }}>
          <span className="impact-badge" style={{ color: t.color }}>
            {h.impact.toFixed(1)}
            <small>/ 100 impact</small>
          </span>
        </div>
        <div style={{ marginTop: 8 }}>
          <span className="chip" style={{ borderColor: t.color, color: t.color }}>
            {t.label}
          </span>
          <span className="chip">Rank #{rank}</span>
          <span className="chip">{h.station}</span>
        </div>
        {place?.locality && (
          <div className="locality" title="Nearest place — Mappls partner data">
            <span className="pin">◎</span> {place.locality}
            <span className="locality-src">Mappls</span>
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-title">
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
        <div className="factor-grid">
          <div className="factor">
            <div className="fv">{h.n.toLocaleString()}</div>
            <div className="fk">Violations · 5 mo</div>
          </div>
          <div className="factor">
            <div className="fv">{h.severity.toFixed(2)}</div>
            <div className="fk">Avg severity / 5</div>
          </div>
          <div className="factor">
            <div className="fv">{h.persistence}%</div>
            <div className="fk">Days active</div>
          </div>
          <div className="factor">
            <div className="fv">{Math.round(h.junctionShare * 100)}%</div>
            <div className="fk">Near junction</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">
          When it happens <span>peak {String(peakHour).padStart(2, "0")}:00</span>
        </div>
        <HourSpark hours={h.hours} />
      </div>

      <div className="section">
        <div className="section-title">Top violation types</div>
        <BarList items={h.violations} total={vTotal} />
      </div>

      <div className="section">
        <div className="section-title">Offending vehicles</div>
        <BarList items={h.vehicles} total={carTotal} />
      </div>

      <div className="section">
        <div className="section-title">Recommended action</div>
        <p className="action">
          Deploy enforcement at <b>{h.station}</b> beat around{" "}
          <b>{String(peakHour).padStart(2, "0")}:00</b>. Target{" "}
          <b>{h.violations[0][0].toLowerCase()}</b> by{" "}
          <b>{h.vehicles[0][0].toLowerCase()}</b>s — the dominant pattern in this
          180m cell. {h.junctionShare >= 0.6 ? "Junction-adjacent: clearing this cell directly relieves signal back-up." : ""}
        </p>
      </div>
    </>
  );
}
