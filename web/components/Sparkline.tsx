"use client";

// Catmull-Rom -> cubic-bezier smoothing (tension 1/6), matching the design handoff.
export function smooth(
  values: number[],
  W: number,
  H: number,
  padX: number,
  padTop: number,
  padBot: number
) {
  const n = values.length;
  const max = Math.max(...values) || 1;
  const pts = values.map(
    (v, i) =>
      [
        padX + (i / (n - 1)) * (W - padX * 2),
        padTop + (1 - v / max) * (H - padTop - padBot),
      ] as [number, number]
  );
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || pts[i + 1];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(
      1
    )} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return { line: d, pts, max };
}

let uid = 0;

/** Smooth area chart used in the "citywide rhythm" card. */
export function AreaChart({ values }: { values: number[] }) {
  const W = 280;
  const H = 78;
  const { line, pts } = smooth(values, W, H, 2, 6, 6);
  const peakI = values.indexOf(Math.max(...values));
  const area = `${line} L${(W - 2).toFixed(1)},72 L2,72 Z`;
  const gid = `kbArea-${(uid += 1)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7AA2FF" stopOpacity="0.34" />
          <stop offset="1" stopColor="#7AA2FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke="#7AA2FF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={pts[peakI][0].toFixed(1)}
        cy={pts[peakI][1].toFixed(1)}
        r="3.4"
        fill="#0B0D10"
        stroke="#7AA2FF"
        strokeWidth="2"
      />
    </svg>
  );
}

/** Tiny smoothed sparkline for each priority-board card. */
export function MiniSpark({ values, color }: { values: number[]; color: string }) {
  const { line } = smooth(values, 56, 22, 1, 3, 3);
  return (
    <svg viewBox="0 0 56 22" className="pspark">
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}

/** Circular progress ring (impact as a share of the circumference). */
export function Ring({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const r = 19;
  const circ = 2 * Math.PI * r;
  const len = circ * Math.max(0, Math.min(1, value / (max || 1)));
  return (
    <div className="pring">
      <svg viewBox="0 0 46 46">
        <circle cx="23" cy="23" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
        <circle
          cx="23"
          cy="23"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${len.toFixed(1)} ${circ.toFixed(1)}`}
        />
      </svg>
      <div className="pring-val">{label}</div>
    </div>
  );
}

export function HourSpark({ hours }: { hours: number[] }) {
  const max = Math.max(1, ...hours);
  const peak = hours.indexOf(max);
  return (
    <div>
      <div className="spark">
        {hours.map((v, i) => (
          <i
            key={i}
            style={{
              height: `${Math.max(2, (v / max) * 100)}%`,
              opacity: i === peak ? 1 : 0.5,
              background: i === peak ? "var(--med)" : "var(--blue)",
            }}
            title={`${String(i).padStart(2, "0")}:00 — ${v}`}
          />
        ))}
      </div>
      <div className="spark-axis">
        <span>00h</span>
        <span>06h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </div>
    </div>
  );
}

export function BarList({
  items,
  total,
}: {
  items: [string, number][];
  total: number;
}) {
  return (
    <div className="bar-list">
      {items.map(([label, count]) => (
        <div className="bar-item" key={label}>
          <div className="top">
            <span>{label}</span>
            <span>{count.toLocaleString()}</span>
          </div>
          <div className="bar-track">
            <i style={{ width: `${Math.max(3, (count / total) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
