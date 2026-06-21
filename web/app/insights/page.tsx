"use client";

import { useEffect, useMemo, useState } from "react";
import type { Meta, Hotspot, Station } from "@/lib/types";
import Loader from "@/components/Loader";
import Methodology from "@/components/Methodology";
import TopBar from "@/components/TopBar";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function InsightsPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [showMethod, setShowMethod] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/data/meta.json").then((r) => r.json()),
      fetch("/data/hotspots.json").then((r) => r.json()),
      fetch("/data/stations.json").then((r) => r.json()),
    ]).then(([m, h, s]) => {
      setMeta(m);
      setHotspots(h);
      setStations(s);
    });
  }, []);

  const stats = useMemo(() => {
    if (!meta || !hotspots.length)
      return null;

    // concentration: share of all violations sitting in the worst 5% of cells
    const byCount = [...hotspots].sort((a, b) => b.n - a.n);
    const totalViol = hotspots.reduce((s, h) => s + h.n, 0);
    const top5pct = Math.max(1, Math.round(byCount.length * 0.05));
    const concViol = byCount
      .slice(0, top5pct)
      .reduce((s, h) => s + h.n, 0);
    const concentration = (concViol / totalViol) * 100;

    const tiers = {
      critical: hotspots.filter((h) => h.impact >= 60).length,
      high: hotspots.filter((h) => h.impact >= 40 && h.impact < 60).length,
      moderate: hotspots.filter((h) => h.impact >= 22 && h.impact < 40).length,
      watch: hotspots.filter((h) => h.impact < 22).length,
    };

    const junctionViol = hotspots
      .filter((h) => h.junctionShare >= 0.6)
      .reduce((s, h) => s + h.n, 0);
    const junctionShare = (junctionViol / totalViol) * 100;

    return { concentration, top5pct, tiers, junctionShare, totalViol };
  }, [meta, hotspots]);

  if (!meta || !stats) return <Loader label="loading insights" />;

  const vMax = Math.max(...meta.violationTotals.map((v) => v[1]));
  const carMax = Math.max(...meta.vehicleTotals.map((v) => v[1]));
  const hMax = Math.max(...meta.hourCurve);
  const dMax = Math.max(...meta.dowCurve);
  const peakHour = meta.hourCurve.indexOf(hMax);
  const beats = [...stations].sort((a, b) => b.impact - a.impact).slice(0, 12);
  const tierMax = Math.max(...Object.values(stats.tiers));

  return (
    <div className="ins">
      <TopBar
        active="insights"
        onMethodology={() => setShowMethod(true)}
        right={
          <div className="partner">
            <span className="dot" />
            {meta.dateStart} → {meta.dateEnd} · {meta.spanDays} days
          </div>
        }
      />

      <div className="ins-scroll">
        <div className="ins-wrap">
          <h1 className="ins-h1">The shape of Bengaluru&apos;s parking problem</h1>
          <p className="ins-lede">
            {meta.records.toLocaleString()} enforcement records, geotagged to{" "}
            {meta.cells.toLocaleString()} street cells. The story underneath is
            one of <b>extreme concentration</b> — which is exactly what makes
            targeted enforcement work.
          </p>

          {/* headline cards */}
          <div className="ins-cards">
            <div className="ins-card accent">
              <div className="big">{stats.concentration.toFixed(0)}%</div>
              <div className="cap">
                of all violations occur in just the worst{" "}
                <b>{stats.top5pct}</b> cells (top 5%)
              </div>
            </div>
            <div className="ins-card">
              <div className="big" style={{ color: "var(--hot)" }}>
                {stats.tiers.critical}
              </div>
              <div className="cap">
                critical hotspots (impact ≥ 60) needing standing enforcement
              </div>
            </div>
            <div className="ins-card">
              <div className="big" style={{ color: "var(--cool)" }}>
                {stats.junctionShare.toFixed(0)}%
              </div>
              <div className="cap">
                of violations sit on junction-adjacent cells that directly choke
                signals
              </div>
            </div>
            <div className="ins-card">
              <div className="big">{String(peakHour).padStart(2, "0")}:00</div>
              <div className="cap">
                citywide peak — when enforcement teams should already be deployed
              </div>
            </div>
          </div>

          {/* timing */}
          <div className="ins-grid-2">
            <section className="ins-block">
              <div className="ins-block-t">When it happens · by hour</div>
              <div className="chart-hours">
                {meta.hourCurve.map((v, i) => (
                  <div className="ch-col" key={i}>
                    <i
                      style={{
                        height: `${Math.max(2, (v / hMax) * 100)}%`,
                        background:
                          i === peakHour ? "var(--amber)" : "var(--blue)",
                        opacity: i === peakHour ? 1 : 0.55,
                      }}
                      title={`${String(i).padStart(2, "0")}:00 — ${v.toLocaleString()}`}
                    />
                    {i % 3 === 0 && (
                      <span className="ch-x">{String(i).padStart(2, "0")}</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="ins-note">
                A sharp 08:00–12:00 morning surge: market loading, school runs and
                commuter overspill. Demand-side, not random.
              </p>
            </section>

            <section className="ins-block">
              <div className="ins-block-t">When it happens · by weekday</div>
              <div className="chart-dow">
                {meta.dowCurve.map((v, i) => (
                  <div className="cd-row" key={i}>
                    <span className="cd-lab">{DOW[i]}</span>
                    <div className="cd-track">
                      <i
                        style={{
                          width: `${(v / dMax) * 100}%`,
                          background: i >= 5 ? "var(--warm)" : "var(--blue)",
                        }}
                      />
                    </div>
                    <span className="cd-val">{(v / 1000).toFixed(1)}k</span>
                  </div>
                ))}
              </div>
              <p className="ins-note">
                Weekend (Sat–Sun) volumes stay high — this is a 7-day problem, not
                a weekday commute artefact.
              </p>
            </section>
          </div>

          {/* what & who */}
          <div className="ins-grid-2">
            <section className="ins-block">
              <div className="ins-block-t">What kind of violation</div>
              <div className="hbars">
                {meta.violationTotals.slice(0, 8).map(([label, c]) => (
                  <div className="hbar" key={label}>
                    <div className="hbar-top">
                      <span>{label}</span>
                      <span>{c.toLocaleString()}</span>
                    </div>
                    <div className="hbar-track">
                      <i style={{ width: `${(c / vMax) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="ins-block">
              <div className="ins-block-t">Who is parking illegally</div>
              <div className="hbars">
                {meta.vehicleTotals.slice(0, 8).map(([label, c]) => (
                  <div className="hbar" key={label}>
                    <div className="hbar-top">
                      <span>{label}</span>
                      <span>{c.toLocaleString()}</span>
                    </div>
                    <div className="hbar-track">
                      <i
                        style={{
                          width: `${(c / carMax) * 100}%`,
                          background:
                            "linear-gradient(90deg, var(--blue), var(--cool))",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* impact tiers */}
          <section className="ins-block">
            <div className="ins-block-t">Hotspots by severity tier</div>
            <div className="tiers">
              {[
                { k: "critical", label: "Critical · ≥60", c: "var(--hot)" },
                { k: "high", label: "High · 40–60", c: "var(--warm)" },
                { k: "moderate", label: "Moderate · 22–40", c: "var(--amber)" },
                { k: "watch", label: "Watch · <22", c: "var(--cool)" },
              ].map((t) => {
                const v = stats.tiers[t.k as keyof typeof stats.tiers];
                return (
                  <div className="tier" key={t.k}>
                    <div className="tier-head">
                      <span style={{ color: t.c }}>{t.label}</span>
                      <b>{v.toLocaleString()}</b>
                    </div>
                    <div className="tier-track">
                      <i
                        style={{
                          width: `${(v / tierMax) * 100}%`,
                          background: t.c,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* beat leaderboard */}
          <section className="ins-block">
            <div className="ins-block-t">Police beats ranked by congestion load</div>
            <table className="ltable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Beat</th>
                  <th className="num">Violations</th>
                  <th className="num">Hot cells</th>
                  <th className="num">Avg impact</th>
                  <th className="num">Peak</th>
                  <th className="num">Junction</th>
                </tr>
              </thead>
              <tbody>
                {beats.map((s, i) => (
                  <tr key={s.name}>
                    <td className="rk">{i + 1}</td>
                    <td className="bn">{s.name}</td>
                    <td className="num">{s.n.toLocaleString()}</td>
                    <td className="num">{s.hotCells}</td>
                    <td className="num">
                      <span
                        className="ipill"
                        style={{
                          color:
                            s.impact >= 50
                              ? "var(--hot)"
                              : s.impact >= 35
                              ? "var(--warm)"
                              : "var(--amber)",
                        }}
                      >
                        {s.impact.toFixed(1)}
                      </span>
                    </td>
                    <td className="num">{String(s.peakHour).padStart(2, "0")}:00</td>
                    <td className="num">{Math.round(s.junctionShare * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* takeaway */}
          <section className="ins-block takeaway">
            <div className="ins-block-t">What this means for enforcement</div>
            <ul className="takeaways">
              <li>
                <b>Concentrate, don&apos;t spread.</b> {stats.concentration.toFixed(0)}%
                of the problem lives in {stats.top5pct} cells — a handful of
                roving teams can cover the worst of the city.
              </li>
              <li>
                <b>Clock-in by {String(peakHour).padStart(2, "0")}:00.</b> The
                morning surge is predictable; presence before the peak prevents
                the cell from clogging in the first place.
              </li>
              <li>
                <b>Protect the junctions.</b> {stats.junctionShare.toFixed(0)}% of
                violations sit next to signals, where a single blocked lane
                cascades into city-wide delay.
              </li>
              <li>
                <b>Target the vehicle mix.</b> Two-wheelers and autos dominate —
                enforcement and parking provision should be designed for them,
                not just cars.
              </li>
            </ul>
            <p className="ins-disclaim">
              Impact is a transparent composite — volume × severity × persistence
              × junction-proximity — built entirely from the provided enforcement
              dataset. No external feeds, so it is fully reproducible by the
              Bengaluru Traffic Police.{" "}
              <button className="inline-link" onClick={() => setShowMethod(true)}>
                See how impact is scored →
              </button>
            </p>
          </section>
        </div>
      </div>

      {showMethod && (
        <Methodology
          meta={meta}
          hotspots={hotspots}
          onClose={() => setShowMethod(false)}
        />
      )}
    </div>
  );
}
