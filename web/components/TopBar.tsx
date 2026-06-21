"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/** Single shared top bar so the brand + segmented nav are identical on every page. */
export default function TopBar({
  active,
  onMethodology,
  right,
}: {
  active: "ops" | "insights";
  onMethodology: () => void;
  right?: ReactNode;
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">K</div>
        <div>
          <div className="brand-name">Kerbline</div>
          <div className="brand-sub">Congestion Intelligence</div>
        </div>
      </div>

      <nav className="nav">
        {active === "ops" ? (
          <span className="nav-link on">Operations</span>
        ) : (
          <Link className="nav-link" href="/">
            Operations
          </Link>
        )}
        {active === "insights" ? (
          <span className="nav-link on">Insights</span>
        ) : (
          <Link className="nav-link" href="/insights">
            Insights
          </Link>
        )}
        <button className="nav-link nav-btn" onClick={onMethodology}>
          Methodology
        </button>
      </nav>

      <div className="topstats">{right}</div>
    </header>
  );
}
