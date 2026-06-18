# Kerbline — Concept Note

**Gridlock Hackathon 2.0 · Theme 1: Parking-Induced Congestion**
**A parking-enforcement intelligence system for the Bengaluru Traffic Police.**

> One line: *We turn 298,450 raw parking-violation records into an hour-aware enforcement plan — which beats to send roving teams to, in which shift, to clear the city's worst chokepoints.*

---

## 1. The problem

In Bengaluru, illegal parking is not a paperwork nuisance — it is a moving cause of congestion. A car left in a main road, on a crossing, or beside a junction narrows the carriageway, breaks lane discipline, and backs up an entire signal cycle. The Bengaluru Traffic Police already records where these violations happen, in volume. What the data does *not* do on its own is tell an officer **where it matters most, and when** — so enforcement is spread thin instead of aimed.

The opportunity is not more data collection. It is **turning the enforcement data BTP already owns into an enforcement decision.**

## 2. The constraint that shaped the design

The provided dataset is rich in *where* and *what*, but has **no traffic-flow, speed, or real-time signal**, and the rules forbid any external data. So we cannot measure congestion directly, and we refuse to fake it by importing maps or feeds we're not allowed to use.

We treat this as a design constraint, not an excuse. Instead of claiming to measure flow, we **derive a transparent proxy** for flow damage from signals already inside the violations — and we are explicit, in the product itself, about exactly what it is and is not.

## 3. The approach — a Congestion Impact Score

We lay a ~180 m grid over the city (4,925 cells) and score every cell 0–100:

```
impact = 100 × ( 0.40·volume + 0.30·severity + 0.20·persistence + 0.10·junction )
```

| Factor | What it captures | Normalisation |
|---|---|---|
| **Volume** (0.40) | how many violations the cell absorbs | `log(1+n) ÷ log(1+max)` — log-scaled so one runaway cell doesn't flatten the rest |
| **Severity** (0.30) | how much the *offence* blocks the carriageway — parking in a main road / on a crossing / double parking = 5; a defective number plate = 1 | `(severity − 1) ÷ 4` |
| **Persistence** (0.20) | chronic chokepoint vs one-off — share of the 150-day window the cell was active | `active days ÷ span` |
| **Junction** (0.10) | junction-adjacent blocking backs up a whole signal cycle | share of the cell's violations near a named junction |

The score is fully reconstructible — the in-app **Methodology** panel rebuilds the city's #1 cell (City Market, **84.5**) factor by factor, live, and lands within 0.03 of the stored value. Nothing is a black box.

**What the score finds.** The worst cells are exactly the corridors a Bengaluru officer would name: **City Market (84.5), Shivajinagar (81.9), Upparpet (79.6)**. Rolled up to beats, the priority order is **Upparpet, City Market, Shivajinagar, Halasuru Gate, Chamarajpet, Vijayanagara** — and the citywide peak sits at **09:00–10:00**, the morning commute.

## 4. From insight to action

A score is not a solution. The decisive finding is **concentration**: the worst **5% of cells hold ~65% of all violations** (Gini 0.85), and just **118 of 4,925 cells cover half the city's problem.** Congestion this concentrated is *enforceable* — a small number of roving teams, aimed correctly, can move the needle.

That is what the **Deployment Planner** does. Pick a team count and a shift; it groups hotspots by police beat, scores each beat by the congestion impact realised *in that shift*, assigns one team per top beat, and reports honest coverage. Eight teams in the morning shift cover ~29% of that shift's congestion impact — and changing the shift genuinely reshuffles the assignment, because the city's hotspots move across the day.

This is the product's thesis: **we turned enforcement data into an enforcement plan.**

## 5. Does the score hold up? — validation

The fair objection to any hand-built score is "your weights are arbitrary / you're fitting noise." Because there is no flow ground truth, we can't prove the score is *correct* — but we can show it isn't *arbitrary*, with four checks reproducible from the dataset alone (all surfaced in the app):

1. **Weights aren't load-bearing.** Re-running the score 2,000 times with every weight randomly shifted ±50% barely moves the ranking — **median Spearman ρ = 0.986**, and 95% of the top-20 hotspots stay top-20. Even forcing all four weights equal holds **ρ = 0.926.** The signal drives the ranking, not the exact coefficients.
2. **It's structural, not noise.** Split the six months in half and score each independently: the rankings agree (**ρ = 0.795**) and **75% of the top-20 hotspots recur in both halves.** Chokepoints persist.
3. **An outside signal agrees.** The number of *distinct* violation types a cell attracts is never used in the score, yet tracks it (**ρ = 0.657**) — genuine chokepoints draw varied violations. Independent support from a feature we didn't engineer in.
4. **Targeting is viable.** The concentration above (Gini 0.85; 118 cells for half the city) is what makes a handful of teams worth deploying in the first place.

This is the difference between "here is a number" and "here is a number you can defend in a review."

## 6. The product

A desktop control-room web app, three screens:

- **Operations** — a live map of every hotspot, coloured by impact, with a density layer, beat/vehicle/min-impact filters, and a **time-of-day scrubber** that animates how congestion migrates across 24 hours.
- **Insights** — the analytics story: concentration, timing curves, violation/vehicle mix, severity tiers, and a beat leaderboard.
- **Deployment Planner** — the action layer described above.

## 7. Architecture & feasibility

**Static precompute → static frontend.** A Python/pandas pipeline crunches the dataset once into small JSON files; a Next.js + deck.gl app reads them. No live backend.

```
Dataset.csv → pipeline/build_data.py + validate.py → web/public/data/*.json → Next.js + deck.gl
```

Consequences that matter for a demo to BTP: it is **demo-proof** (no server to fall over), **runs fully offline**, deploys anywhere (Vercel) in minutes, and loads in milliseconds. Every number on screen is reproducible from one CSV.

## 8. Scalability

- **Other cities / more data.** The pipeline is parameterised on a grid and a violation→severity map; point it at any geotagged enforcement dump and it produces the same artefacts. The cost grows linearly with rows and is paid once, offline.
- **Live operation.** The same precompute can run nightly (or on a stream) to refresh the JSON; nothing in the frontend assumes the data is static.
- **Richer factors.** If BTP later supplies signal/CCTV/flow data, it slots in as additional weighted factors — the validation harness already measures whether a new factor changes the ranking, so additions are testable, not guesswork.

## 9. Real-world viability for BTP

The intended user is a beat officer or a control-room planner, not a data scientist. The Monday-morning workflow is: open the Planner, set today's team count and shift, read off the beat assignments and target windows, deploy. The map and Insights exist to *justify* the plan to a supervisor, and the Methodology + validation exist to *defend* it. It asks for nothing BTP doesn't already collect.

## 10. Limitations — stated plainly

- The impact score is a **proxy**, not a measurement of flow; we say so in the product.
- Severity weights are a domain judgment (validated as robust, not proven optimal).
- Coverage figures are deliberately **un-inflated** — they reflect impact realised, not violations "touched."

We'd rather present an honest proxy with its error bars visible than a confident black box.

## 11. Compliance

**Single source: the official challenge dataset.** No external feeds, no live inference, no scraped maps. Every figure in this note and in the app is reproducible offline from `Dataset.csv` via the two pipeline scripts.

---

*Built for the Bengaluru Traffic Police × Flipkart Gridlock Hackathon 2.0.*
