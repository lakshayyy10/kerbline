# Kerbline

**Parking-induced congestion intelligence for the Bengaluru Traffic Police.**

Built for the Gridlock Hackathon 2.0 (Theme 1 — Parking-Induced Congestion). Kerbline turns 298,450 raw parking-enforcement records into a ranked, hour-aware enforcement plan: it finds the cells where illegal parking most plausibly chokes traffic flow, and tells you how many roving teams to send, to which beats, in which shift.

## The idea

Not all illegal parking is equally harmful. A footpath violation on a quiet lane is not a main-road blockage at a junction during the morning peak. The dataset records *where* people park illegally — it has no speed or flow feed, and external data is off-limits — so Kerbline derives a transparent **Congestion Impact Score** as a proxy for flow damage:

```
impact = 100 × ( 0.40·volume + 0.30·severity + 0.20·persistence + 0.10·junction )
```

Each factor is normalised 0–1 across all ~4,900 street cells, then weighted. The full breakdown — including a live worked example that reconstructs the city's #1 cell down to the decimal — is in the in-app **Methodology** panel.

## What's in the app

- **Operations** — a deck.gl map of every hotspot cell, coloured by impact, with a density layer, filters (beat / vehicle / minimum impact), and a **time-of-day scrubber** that animates how congestion migrates across the 24 hours.
- **Deployment Planner** — pick a team count and a shift; it groups hotspots by police beat, scores each beat by the congestion impact realised in that shift, assigns one team per top beat, and reports coverage % and violations addressed.
- **Insights** — the analytics story: the concentration stat (the worst 5% of cells hold the majority of violations), timing curves, violation/vehicle mix, severity tiers and a beat leaderboard.

## Architecture

Static precompute → static frontend. A Python/pandas pipeline crunches the dataset once into small JSON files; the Next.js app reads them. No live backend, so it is demo-proof, deploys anywhere, and runs fully offline.

```
pipeline/build_data.py   →   web/public/data/*.json   →   Next.js + deck.gl frontend
```

- **Frontend:** Next.js 15 (App Router), React 19, deck.gl 9, react-map-gl / MapLibre, Carto dark-matter basemap (no token), hand-written CSS.
- **Pipeline:** Python 3, pandas, numpy.

## Running it

```bash
# 1. build the data (needs Dataset.csv in the repo root — see note below)
python pipeline/build_data.py

# 2. run the frontend
cd web
npm install
npm run build && npm start    # http://localhost:3000
```

> **Dataset.** `Dataset.csv` (the official challenge dataset, ~105 MB) is **not** committed — it exceeds GitHub's file limit and is not ours to redistribute. The precomputed `web/public/data/*.json` are included, so the app runs without it; you only need the CSV to re-run the pipeline.

## Compliance

Single source: the official challenge dataset. No external feeds, no live inference — every number is reproducible offline.
