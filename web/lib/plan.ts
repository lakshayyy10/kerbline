import type { Hotspot } from "./types";

export type Shift = "full" | "morning" | "afternoon" | "evening";

// inclusive hour ranges for each shift
const RANGES: Record<Exclude<Shift, "full">, [number, number]> = {
  morning: [6, 11],
  afternoon: [12, 17],
  evening: [18, 23],
};

export const SHIFT_LABEL: Record<Shift, string> = {
  full: "Full day",
  morning: "Morning · 06–12",
  afternoon: "Afternoon · 12–18",
  evening: "Evening · 18–24",
};

const WINDOW: Record<Exclude<Shift, "full">, string> = {
  morning: "06:00–12:00",
  afternoon: "12:00–18:00",
  evening: "18:00–24:00",
};

function shiftVolume(h: Hotspot, shift: Shift): number {
  if (shift === "full") return h.n;
  const [a, b] = RANGES[shift];
  let s = 0;
  for (let i = a; i <= b; i++) s += h.hours[i] || 0;
  return s;
}

function peakHour(h: Hotspot, shift: Shift): number {
  const [a, b] = shift === "full" ? [0, 23] : RANGES[shift];
  let best = a;
  let bv = -1;
  for (let i = a; i <= b; i++) {
    const v = h.hours[i] || 0;
    if (v > bv) {
      bv = v;
      best = i;
    }
  }
  return best;
}

export interface Team {
  team: number;
  beat: string;
  lon: number;
  lat: number;
  window: string;
  peakHour: number;
  target: string;
  vehicle: string;
  violations: number;
  cells: number;
  score: number;
}

export interface Plan {
  teams: Team[];
  coverage: number; // % of citywide congestion impact covered
  coveredViol: number; // violations addressed by the deployed teams (in shift)
  totalBeats: number;
}

interface Beat {
  name: string;
  shiftVol: number;
  score: number;
  cells: number;
  best: Hotspot | null;
  bestVol: number;
}

export function buildPlan(
  hotspots: Hotspot[],
  shift: Shift,
  teamCount: number
): Plan {
  const beats = new Map<string, Beat>();

  for (const h of hotspots) {
    const sv = shiftVolume(h, shift);
    if (sv <= 0) continue;
    const frac = sv / Math.max(1, h.n);
    const score = h.impact * frac; // congestion impact realised in this shift

    let b = beats.get(h.station);
    if (!b) {
      b = { name: h.station, shiftVol: 0, score: 0, cells: 0, best: null, bestVol: 0 };
      beats.set(h.station, b);
    }
    b.shiftVol += sv;
    b.score += score;
    b.cells += 1;
    if (sv > b.bestVol) {
      b.bestVol = sv;
      b.best = h;
    }
  }

  const ranked = [...beats.values()]
    .filter((b) => b.best)
    .sort((a, b) => b.score - a.score);

  const totalScore = ranked.reduce((s, b) => s + b.score, 0) || 1;
  const chosen = ranked.slice(0, teamCount);

  const teams: Team[] = chosen.map((b, i) => {
    const h = b.best!;
    const ph = peakHour(h, shift);
    const window =
      shift === "full"
        ? `${String(Math.max(0, ph - 1)).padStart(2, "0")}:00–${String(
            Math.min(23, ph + 3)
          ).padStart(2, "0")}:00`
        : WINDOW[shift];
    return {
      team: i + 1,
      beat: b.name,
      lon: h.lon,
      lat: h.lat,
      window,
      peakHour: ph,
      target: h.violations[0]?.[0] ?? "parking violation",
      vehicle: h.vehicles[0]?.[0] ?? "vehicle",
      violations: Math.round(b.shiftVol),
      cells: b.cells,
      score: b.score,
    };
  });

  const coverage = (chosen.reduce((s, b) => s + b.score, 0) / totalScore) * 100;
  const coveredViol = teams.reduce((s, t) => s + t.violations, 0);

  return { teams, coverage, coveredViol, totalBeats: ranked.length };
}
