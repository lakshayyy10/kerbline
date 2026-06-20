"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Meta, Hotspot, Station, HeatPoint, Places } from "@/lib/types";
import { buildPlan, SHIFT_LABEL, type Shift, type Team } from "@/lib/plan";
import HotspotDetail from "@/components/HotspotDetail";
import Methodology from "@/components/Methodology";
import Loader from "@/components/Loader";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <Loader label="initialising map" />,
});

export default function Page() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [heat, setHeat] = useState<HeatPoint[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [places, setPlaces] = useState<Places>({});

  const [mode, setMode] = useState<"heat" | "points" | "deploy">("points");
  const [minImpact, setMinImpact] = useState(0);
  const [vehicle, setVehicle] = useState("all");
  const [station, setStation] = useState("all");

  // deployment planner
  const [teamCount, setTeamCount] = useState(8);
  const [shift, setShift] = useState<Shift>("morning");
  const [activeTeam, setActiveTeam] = useState<number | null>(null);

  // time-of-day scrubber (null = whole day)
  const [hour, setHour] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const [showMethod, setShowMethod] = useState(false);

  const [selected, setSelected] = useState<Hotspot | null>(null);
  const [focus, setFocus] = useState<{ lon: number; lat: number; nonce: number } | null>(
    null
  );

  useEffect(() => {
    Promise.all([
      fetch("/data/meta.json").then((r) => r.json()),
      fetch("/data/hotspots.json").then((r) => r.json()),
      fetch("/data/heat.json").then((r) => r.json()),
      fetch("/data/stations.json").then((r) => r.json()),
    ]).then(([m, h, ht, s]) => {
      setMeta(m);
      setHotspots(h);
      setHeat(ht);
      setStations(s);
    });
    // optional enrichment (Mappls partner place names); fine if absent
    fetch("/data/places.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then(setPlaces)
      .catch(() => setPlaces({}));
  }, []);

  const vehicleOptions = useMemo(
    () => (meta ? meta.vehicleTotals.slice(0, 8).map((v) => v[0]) : []),
    [meta]
  );

  const filtered = useMemo(() => {
    return hotspots.filter((h) => {
      if (h.impact < minImpact) return false;
      if (station !== "all" && h.station !== station) return false;
      if (vehicle !== "all" && !h.vehicles.some(([v]) => v === vehicle))
        return false;
      return true;
    });
  }, [hotspots, minImpact, station, vehicle]);

  const kpis = useMemo(() => {
    const n = filtered.length;
    const viol = filtered.reduce((s, h) => s + h.n, 0);
    const critical = filtered.filter((h) => h.impact >= 60).length;
    const avg = n ? filtered.reduce((s, h) => s + h.impact, 0) / n : 0;
    return { n, viol, critical, avg };
  }, [filtered]);

  const plan = useMemo(
    () => buildPlan(hotspots, shift, teamCount),
    [hotspots, shift, teamCount]
  );

  // auto-advance the hour scrubber while playing
  useEffect(() => {
    if (!playing) return;
    if (hour === null) setHour(0);
    const id = setInterval(() => {
      setHour((h) => ((h ?? -1) + 1) % 24);
    }, 750);
    return () => clearInterval(id);
  }, [playing, hour === null]);

  // count of violations cleaving / arriving at the scrubbed hour
  const hourStat = useMemo(() => {
    if (hour === null || !meta) return null;
    const total = meta.hourCurve.reduce((s, v) => s + v, 0) || 1;
    const at = meta.hourCurve[hour] || 0;
    const peak = Math.max(...meta.hourCurve);
    return { at, pct: (at / total) * 100, isPeak: at === peak };
  }, [hour, meta]);

  function pick(h: Hotspot) {
    setSelected(h);
    setFocus({ lon: h.lon, lat: h.lat, nonce: Date.now() });
  }

  function pickTeam(t: Team) {
    setActiveTeam(t.team);
    setFocus({ lon: t.lon, lat: t.lat, nonce: Date.now() });
  }

  const selectedRank = selected
    ? filtered.findIndex((h) => h.id === selected.id) + 1
    : 0;

  if (!meta) return <Loader label="loading Kerbline" />;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">K</div>
          <div>
            <div className="brand-name">
              Kerb<b>line</b>
            </div>
            <div className="brand-sub">Parking-Induced Congestion Intelligence</div>
          </div>
        </div>

        <nav className="nav">
          <span className="nav-link on">Operations</span>
          <Link className="nav-link" href="/insights">
            Insights
          </Link>
          <button className="nav-link nav-btn" onClick={() => setShowMethod(true)}>
            Methodology
          </button>
        </nav>

        <div className="topstats">
          <div className="topstat">
            <div className="v accent">{meta.records.toLocaleString()}</div>
            <div className="k">Violations analysed</div>
          </div>
          <div className="topstat">
            <div className="v">{meta.hotspots.toLocaleString()}</div>
            <div className="k">Hotspot cells</div>
          </div>
          <div className="topstat">
            <div className="v">{meta.stations}</div>
            <div className="k">Police beats</div>
          </div>
        </div>

        <div className="partner">
          <span className="dot" />
          {meta.dateStart} → {meta.dateEnd}
        </div>
      </header>

      <div className="main">
        {/* ---------------- LEFT ---------------- */}
        <aside className="panel left">
          <div className="panel-scroll">
            <div className="section">
              <div className="section-title">City overview</div>
              <div className="statgrid">
                <div className="stat">
                  <div className="v" style={{ color: "var(--amber)" }}>
                    {kpis.n.toLocaleString()}
                  </div>
                  <div className="k">Active hotspots</div>
                </div>
                <div className="stat">
                  <div className="v" style={{ color: "var(--hot)" }}>
                    {kpis.critical}
                  </div>
                  <div className="k">Critical (≥60)</div>
                </div>
                <div className="stat">
                  <div className="v">{(kpis.viol / 1000).toFixed(0)}k</div>
                  <div className="k">Violations</div>
                </div>
                <div className="stat">
                  <div className="v">{kpis.avg.toFixed(1)}</div>
                  <div className="k">Avg impact</div>
                </div>
              </div>
            </div>

            <div className="section">
              <div className="section-title">Map layer</div>
              <div className="seg">
                <button
                  className={mode === "points" ? "on" : ""}
                  onClick={() => setMode("points")}
                >
                  Hotspots
                </button>
                <button
                  className={mode === "heat" ? "on" : ""}
                  onClick={() => {
                    setMode("heat");
                    setPlaying(false);
                  }}
                >
                  Density
                </button>
                <button
                  className={mode === "deploy" ? "on" : ""}
                  onClick={() => {
                    setMode("deploy");
                    setPlaying(false);
                    setSelected(null);
                  }}
                >
                  Deploy
                </button>
              </div>
            </div>

            {mode === "deploy" && (
              <div className="section">
                <div className="section-title">Deployment planner</div>
                <div className="field">
                  <label className="label">Available teams · {teamCount}</label>
                  <input
                    type="range"
                    min={3}
                    max={20}
                    step={1}
                    value={teamCount}
                    onChange={(e) => setTeamCount(Number(e.target.value))}
                  />
                  <div className="range-row">
                    <span>3</span>
                    <span>20</span>
                  </div>
                </div>
                <div className="field">
                  <label className="label">Shift window</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as Shift)}
                  >
                    {(Object.keys(SHIFT_LABEL) as Shift[]).map((s) => (
                      <option key={s} value={s}>
                        {SHIFT_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="coverage">
                  <div className="cov-num">{plan.coverage.toFixed(0)}%</div>
                  <div className="cov-cap">
                    of citywide congestion impact covered by {teamCount} teams ·{" "}
                    {plan.coveredViol.toLocaleString()} violations addressed
                  </div>
                  <div className="cov-bar">
                    <i style={{ width: `${plan.coverage}%` }} />
                  </div>
                </div>
              </div>
            )}

            <div className="section">
              <div className="section-title">Filters</div>

              <div className="field">
                <label className="label">
                  Minimum impact · {minImpact.toFixed(0)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={Math.ceil(meta.topImpact)}
                  step={1}
                  value={minImpact}
                  onChange={(e) => setMinImpact(Number(e.target.value))}
                />
                <div className="range-row">
                  <span>all</span>
                  <span>{Math.ceil(meta.topImpact)}</span>
                </div>
              </div>

              <div className="field">
                <label className="label">Police beat</label>
                <select
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                >
                  <option value="all">All beats</option>
                  {stations.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="label">Vehicle type</label>
                <select
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                >
                  <option value="all">All vehicles</option>
                  {vehicleOptions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="section">
              <div className="section-title">Citywide rhythm</div>
              <label className="label">Violations by hour of day</label>
              <div className="spark" style={{ height: 54 }}>
                {meta.hourCurve.map((v, i) => {
                  const mx = Math.max(...meta.hourCurve);
                  const peak = meta.hourCurve.indexOf(mx);
                  return (
                    <i
                      key={i}
                      style={{
                        height: `${Math.max(2, (v / mx) * 100)}%`,
                        background: i === peak ? "var(--amber)" : "var(--blue)",
                        opacity: i === peak ? 1 : 0.5,
                      }}
                      title={`${String(i).padStart(2, "0")}:00 — ${v.toLocaleString()}`}
                    />
                  );
                })}
              </div>
              <div className="spark-axis">
                <span>00h</span>
                <span>10h — peak</span>
                <span>23h</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ---------------- MAP ---------------- */}
        <div className="map-wrap">
          <MapView
            hotspots={mode === "deploy" ? hotspots : filtered}
            heat={heat}
            teams={plan.teams}
            mode={mode}
            maxImpact={meta.topImpact}
            hour={mode === "points" ? hour : null}
            selectedId={selected?.id ?? null}
            activeTeam={activeTeam}
            focus={focus}
            onSelect={pick}
            onTeam={pickTeam}
          />
          {mode === "points" && (
            <div className="scrubber">
              <button
                className={`scrub-play${playing ? " on" : ""}`}
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "pause" : "play"}
              >
                {playing ? "❚❚" : "▶"}
              </button>
              <div className="scrub-body">
                <div className="scrub-head">
                  <span className="scrub-when">
                    {hour === null
                      ? "Whole day"
                      : `${String(hour).padStart(2, "0")}:00`}
                  </span>
                  {hourStat ? (
                    <span className="scrub-stat">
                      {hourStat.at.toLocaleString()} violations ·{" "}
                      {hourStat.pct.toFixed(1)}% of day
                      {hourStat.isPeak ? " · citywide peak" : ""}
                    </span>
                  ) : (
                    <span className="scrub-stat">
                      scrub the hours — watch the hotspots shift
                    </span>
                  )}
                </div>
                <div className="scrub-track">
                  {meta.hourCurve.map((v, i) => {
                    const mx = Math.max(...meta.hourCurve);
                    return (
                      <i
                        key={i}
                        className={hour === i ? "on" : ""}
                        style={{ height: `${Math.max(8, (v / mx) * 100)}%` }}
                        onClick={() => {
                          setPlaying(false);
                          setHour(i);
                        }}
                        title={`${String(i).padStart(2, "0")}:00`}
                      />
                    );
                  })}
                </div>
              </div>
              {hour !== null && (
                <button
                  className="scrub-reset"
                  onClick={() => {
                    setPlaying(false);
                    setHour(null);
                  }}
                >
                  All day
                </button>
              )}
            </div>
          )}
          <div className="map-hint">
            {mode === "points"
              ? hour !== null
                ? `Hotspots at ${String(hour).padStart(2, "0")}:00 · size = activity this hour`
                : `${filtered.length.toLocaleString()} hotspot cells · click any to inspect`
              : mode === "deploy"
              ? `${plan.teams.length} teams deployed · ${SHIFT_LABEL[shift]}`
              : "Violation density — all 298k records"}
          </div>
          {mode !== "deploy" && (
            <div className="legend">
              <div className="ttl">
                {mode === "points" ? "Congestion impact" : "Violation density"}
              </div>
              <div className="scale">
                <div className="grad" />
              </div>
              <div className="ends">
                <span>low</span>
                <span>severe</span>
              </div>
            </div>
          )}
        </div>

        {/* ---------------- RIGHT ---------------- */}
        <aside className="panel right">
          {mode === "deploy" ? (
            <>
              <div className="section" style={{ borderBottom: "1px solid var(--line)" }}>
                <div className="section-title">
                  Deployment roster <span>{plan.teams.length} teams</span>
                </div>
                <p className="board-sub">
                  One enforcement team per beat, ranked by congestion load in the{" "}
                  {SHIFT_LABEL[shift].toLowerCase()} window. Click a team to locate
                  it.
                </p>
              </div>
              <div className="panel-scroll">
                {plan.teams.map((t) => (
                  <div
                    className={`team-card${activeTeam === t.team ? " on" : ""}`}
                    key={t.team}
                    onClick={() => pickTeam(t)}
                  >
                    <div className="team-badge">{t.team}</div>
                    <div className="team-body">
                      <div className="team-head">
                        <span className="team-beat">{t.beat}</span>
                        <span className="team-win">
                          {t.window}
                        </span>
                      </div>
                      <div className="team-action">
                        Target <b>{t.target.toLowerCase()}</b> · mostly{" "}
                        <b>{t.vehicle.toLowerCase()}</b>
                      </div>
                      <div className="team-meta">
                        {t.violations.toLocaleString()} violations · {t.cells} cells
                        · peak {String(t.peakHour).padStart(2, "0")}:00
                      </div>
                    </div>
                  </div>
                ))}
                {plan.teams.length === 0 && (
                  <div className="empty">No activity in this shift window.</div>
                )}
              </div>
            </>
          ) : selected ? (
            <div className="panel-scroll">
              <HotspotDetail
                h={selected}
                rank={selectedRank > 0 ? selectedRank : 1}
                place={places[String(selected.id)]}
                onBack={() => setSelected(null)}
                onMethodology={() => setShowMethod(true)}
              />
            </div>
          ) : (
            <>
              <div className="section" style={{ borderBottom: "1px solid var(--line)" }}>
                <div className="section-title">
                  Enforcement priority board <span>top {Math.min(40, filtered.length)}</span>
                </div>
                <p className="board-sub">
                  Ranked by congestion impact = volume × severity × persistence ×
                  junction proximity.
                </p>
              </div>
              <div className="panel-scroll">
                {filtered.slice(0, 40).map((h, i) => (
                  <div className="prow" key={h.id} onClick={() => pick(h)}>
                    <div className="prank">{i + 1}</div>
                    <div className="pinfo">
                      <div className="pname">{h.station}</div>
                      <div className="pmeta">
                        {h.n.toLocaleString()} viol · sev {h.severity.toFixed(1)} ·{" "}
                        {h.persistence}% days
                      </div>
                    </div>
                    <div className="pscore">
                      <div
                        className="num"
                        style={{
                          color:
                            h.impact >= 60
                              ? "var(--hot)"
                              : h.impact >= 40
                              ? "var(--warm)"
                              : "var(--amber)",
                        }}
                      >
                        {h.impact.toFixed(1)}
                      </div>
                      <div className="bar">
                        <i
                          style={{
                            width: `${(h.impact / meta.topImpact) * 100}%`,
                            background:
                              h.impact >= 60
                                ? "var(--hot)"
                                : h.impact >= 40
                                ? "var(--warm)"
                                : "var(--amber)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="empty">No hotspots match these filters.</div>
                )}
              </div>
            </>
          )}
        </aside>
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
