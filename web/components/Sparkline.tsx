"use client";

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
              opacity: i === peak ? 1 : 0.55,
              background: i === peak ? "var(--amber)" : "var(--blue)",
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
