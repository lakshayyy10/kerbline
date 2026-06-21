# Handoff: Kerbline — Congestion Intelligence Dashboard

## Overview
Kerbline is a parking-violation / congestion-intelligence operations console. The screen is a single-page, dark-mode analytics cockpit: a near-full-bleed map of a city with glowing violation hotspots, flanked by two floating glass side-panels (filters/stats on the left, a ranked "priority board" on the right) and a top bar with brand, a segmented page switcher, and live metric pills. Clicking a hotspot opens a floating glass detail card; clicking a board card expands it inline.

The visual target is *"Apple designs Palantir Gotham, 2026"*: minimal, cinematic, data-dense, calm, expensive. Floating translucent glass over a dark satellite map, lots of negative space, color used only to carry meaning.

## About the Design Files
The files in this bundle are **design references created in HTML** — a working prototype showing the intended look, layout, and interactions. They are **not** production code to copy verbatim. `Kerbline Dashboard.dc.html` is authored in a small in-house component runtime (`support.js`, a custom `<x-dc>` template + `class Component extends DCLogic`); you do **not** need that runtime in the target app.

The task is to **recreate this design in the target codebase's existing environment** (React, Vue, SwiftUI, native, etc.) using its established components, state, and styling conventions. If there is no environment yet, pick the most appropriate framework for the project (React + CSS/Tailwind is a natural fit here) and implement it there. Treat `support.js` only as a reference for the component's logic — re-express that logic idiomatically.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, radii, blur, motion, and copy are all specified below and should be reproduced pixel-for-pixel using the codebase's libraries. The only intentionally-rough areas:
- The **map** is a CSS-painted fake (radial gradients + faint contours). In production this should be a real dark map (Mapbox/MapLibre/deck.gl satellite-dark style); reproduce the *mood* (very dark, no grid lines, subtle vignette), not the exact gradient stops.
- The **Insights** and **Methodology** pages are intentional minimal placeholders (centered kicker/title/body + "Back to Operations"). Only the **Operations** page is fully designed.

## Screens / Views

### 1. Operations (primary view)
**Purpose:** Spot, prioritize, and act on congestion hotspots across the city.

**Top-level layout** — full viewport (`100vw × 100vh`), dark, `overflow:hidden`, three z-layers:
- **Map** — `position:absolute; inset:0; z-index:0`. Full-bleed beneath everything.
- **Top bar** — `position:absolute; top:0; left:0; right:0; height:66px; z-index:30`.
- **Left panel** — `position:absolute; left:20px; top:82px; bottom:20px; width:320px; z-index:20`; vertical flex, `gap:14px`, `overflow-y:auto`.
- **Right panel** — `position:absolute; right:20px; top:82px; bottom:20px; width:360px; z-index:20`; vertical flex, `gap:14px`, `overflow-y:auto`.
- **Map overlays** (legend, time scrubber, hotspot detail) float at `z-index:15–25` between the panels.

The map stays ~70% visible in the gap between the two floating panels — this is the intended "almost 70% map" composition.

#### Top bar
Background `linear-gradient(180deg, rgba(11,13,16,.86), rgba(11,13,16,.4) 70%, transparent)` + `backdrop-filter:blur(12px)`. Flex row, `align-items:center`, `gap:24px`, `padding:0 22px`.

- **Brand (left):** 32×32 rounded-`10px` glass tile (`rgba(255,255,255,.06)`, `1px solid rgba(255,255,255,.1)`, `box-shadow:0 2px 12px rgba(0,0,0,.4)`) with letter "K" (16px? actually 17px/600, warm white). Beside it two stacked lines: "Kerbline" (16px/600, `-0.01em`) and "CONGESTION INTELLIGENCE" (9.5px/500, `letter-spacing:0.16em`, uppercase, `rgba(245,243,238,.36)`).
- **Segmented control (center, `margin:0 auto`):** iOS-style. Container `padding:4px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08); border-radius:14px; backdrop-filter:blur(20px)`. Three buttons — **Operations / Insights / Methodology** — 13px/600, `padding:7px 20px`. A single sliding indicator pill sits behind the active label: `position:absolute; top/bottom:4px; left:4px; width:calc((100% - 8px)/3); border-radius:10px; background:rgba(255,255,255,.1); box-shadow:0 1px 8px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.12)`, moved with `transform:translateX(0% | 100% | 200%)` and `transition:transform .42s cubic-bezier(.34,1.4,.5,1)`. Active label color `#F5F3EE`, inactive `rgba(245,243,238,.5)` (`transition:color .3s`).
- **Metric pills (right):** three glass pills, `gap:10px`. Each: `padding:8px 14px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:13px; backdrop-filter:blur(20px)`, holding a 15px/600 tabular number + an 9.5px/500 uppercase `0.12em` label at `rgba(245,243,238,.4)`. Content: **298K Violations**, **4,912 Hotspots**, **112 Beats**.

#### Left panel
All cards share the **glass card** recipe: `background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:22px; backdrop-filter:blur(20px); box-shadow:0 6px 30px rgba(0,0,0,.28)`. Panel fades in via `kb-fadeup .5s ease`.

1. **Stat grid** — 2×2 CSS grid, `gap:12px`, each cell its own glass card, `padding:16px 16px 15px`. Big number 34px/600, `letter-spacing:-0.025em`, tabular; label 10.5px/500 uppercase `0.1em` at `rgba(245,243,238,.4)`, `margin-top:9px`. Cells:
   - **312** — Active hotspots (warm white).
   - **47** — Critical · ≥60 (number `#FF6B5E`, with a 7px coral dot `box-shadow:0 0 12px #FF6B5E` beside it).
   - **298K** — Violations (warm white).
   - **38.6** — Avg impact (warm white).
2. **Filters card** — `padding:18px 18px 20px`. Header "FILTERS" (11px/600 uppercase `0.14em`, `rgba(245,243,238,.4)`).
   - **Layer chips** — flex row, `gap:7px`, three toggle chips **Hotspots / Density / Deploy**. Each `flex:1; padding:8px 6px; border-radius:11px; font 11.5px/600`. Inactive: `border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.03); color:rgba(245,243,238,.6)`. Active: `border:1px solid rgba(122,162,255,.4); background:rgba(122,162,255,.16); color:#7AA2FF`. `transition:all .25s`. (Default active: Hotspots.)
   - **Slider** — label row "MINIMUM IMPACT" (11px/500 uppercase `0.06em`, `rgba(245,243,238,.55)`) + live value (13px/600 `#7AA2FF`, tabular). `<input type=range min=0 max=90>`, `height:4px; background:rgba(255,255,255,.1); border-radius:99px; accent-color:#7AA2FF`. Default value 18.
   - **Dropdowns** — two: "POLICE BEAT" (All beats / Central / East) and "VEHICLE TYPE" (All vehicles / Two-wheeler / Car · LMV). Each label 10.5px/500 uppercase `0.08em` `rgba(245,243,238,.4)`; select `padding:10px 12px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08); border-radius:12px; color:#F5F3EE; appearance:none`.
3. **Citywide rhythm card** — header "CITYWIDE RHYTHM" + "Peak 10:00" (11px/600 `#7AA2FF`), sub "Violations by hour of day" (10.5px `rgba(245,243,238,.36)`). A **smooth area chart** (SVG, `viewBox 0 0 280 78`): area fill `url(#kbArea)` = vertical gradient `#7AA2FF` `0.34 → 0` opacity; line stroke `#7AA2FF` 2px round; a marker dot at the peak (`r:3.4`, fill `#0B0D10`, stroke `#7AA2FF` 2px). Axis row below: 00h / 12h / 23h (9px `rgba(245,243,238,.3)`).
   - Hour data (0–23h): `[14,10,8,9,12,22,44,70,88,96,100,84,70,60,58,62,70,74,66,52,40,30,22,16]`. The path is a Catmull-Rom→cubic-bézier smoothing of these points (see "Charts" below).

#### Map overlays
- **Severity legend** — `position:absolute; left:360px; bottom:24px`. Glass pill (`border-radius:16px`), flex row `gap:16px`: label "IMPACT" + three dot+label pairs: **Low** `#8A93A0`, **Medium** `#E3B341`, **High** `#FF6B5E` (high dot has `box-shadow:0 0 10px rgba(255,107,94,.6)`).
- **Time scrubber** — bottom-center (`left:50%; translateX(-50%); bottom:24px`). Glass, `border-radius:18px`. A 38×38 play/pause button (toggles glyph `❚❚`/`▶`; active state uses the blue chip treatment), then a column: "10:00" (14px/600) + "14,201 violations · citywide peak" (10.5px `rgba(245,243,238,.4)`), and a 220×20 mini area sparkline (same hour data, blue at lower opacity).
- **Hotspot detail panel** — see Interactions.

#### Center map + hotspots
Map base: `radial-gradient(1400px 900px at 58% 42%, #161A21, #0E1116 55%, #0B0D10 100%)`, plus a slowly drifting layer (`kb-drift 34s`) of three soft blue-gray radial blobs, two ultra-faint "road" lines (`rgba(255,255,255,.04–.05)`), one faint rotated contour ellipse, and a vignette `radial-gradient(120% 120% at 50% 45%, transparent 55%, rgba(0,0,0,.5))`. **No grid lines.**

**Hotspots** (8) are absolutely positioned at `left%/top%`, centered via `transform:translate(-50%,-50%)`, sized in px. Each = a wrapper (the click target, sized = the dot) containing a **pulse ring** and a **dot**:
- **Dot:** `border-radius:50%; background:radial-gradient(circle at 38% 34%, COL, COLcc 55%, COL55); box-shadow:0 0 (size×0.9)px COL88, 0 0 (size×2.4)px COL33; border:1.5px solid rgba(255,255,255,.35)`. Animation `kb-breathe 3.4s ease-in-out infinite` (opacity 0.9↔1). `pointer-events:none`.
- **Pulse ring:** same circle, `background:COL; opacity:.45; animation:kb-pulse (2.6 + id×0.15)s ease-out infinite` (scale 0.85→2.4, fade to 0). `pointer-events:none`.
- **Selected:** dot grows ×1.18 and gets a brighter shadow + white border; **all other hotspots dim to `opacity:.4`** (`transition:opacity .4s`). The wrapper's width/height transition uses `cubic-bezier(.34,1.4,.5,1)`.

Hotspot data (id, name, x%, y%, base size px, severity, impact, violations, persistence %, tier, recoverable):
| id | name | x | y | size | sev | impact | viol | days% | tier | recover |
|----|------|---|---|------|-----|--------|------|-------|------|---------|
| 1 | Shivajinagar PS | 52 | 38 | 30 | 4.1 | 87 | 8,204 | 92 | high | 18% |
| 2 | Commercial Street | 35 | 52 | 26 | 3.8 | 71 | 7,116 | 88 | high | 15% |
| 3 | KR Market | 63 | 47 | 23 | 3.5 | 59 | 6,540 | 79 | med | 12% |
| 4 | Majestic / KSR | 43 | 27 | 20 | 3.2 | 52 | 5,980 | 74 | med | 11% |
| 5 | Jayanagar 4th Blk | 70 | 63 | 17 | 3.0 | 47 | 5,220 | 70 | low | 9% |
| 6 | Indiranagar 100ft | 24 | 67 | 15 | 2.8 | 41 | 4,610 | 66 | low | 8% |
| 7 | Malleshwaram 8th | 80 | 33 | 14 | 2.6 | 38 | 4,012 | 61 | low | 7% |
| 8 | Wilson Garden | 56 | 72 | 13 | 2.4 | 34 | 3,640 | 58 | low | 6% |

Tier → color: `low #8A93A0`, `med #E3B341`, `high #FF6B5E`.

#### Right panel — Priority board
1. **Header card** — "PRIORITY BOARD" + "Top 5" (11px/600 `#7AA2FF`), sub "Ranked by impact = volume × severity × persistence × junction proximity." (11.5px, `rgba(245,243,238,.4)`).
2. **Board cards** (top 5 hotspots, ranked). Each glass card, `padding:16px 18px`, `cursor:pointer`. Collapsed row (flex, `gap:14px`):
   - **Rank** number (13px/600, `rgba(245,243,238,.32)`, width 14, tabular).
   - **Circular progress ring** — 46×46 SVG rotated −90°. Track circle `r:19, stroke rgba(255,255,255,.08) 3.5px`; progress circle same geometry, `stroke = tier color`, `stroke-linecap:round`, `stroke-dasharray = "(2π·19 · impact/100) (2π·19)"` (i.e. arc length = impact% of the circumference ≈ 119.4). Centered label = impact number (13px/600, `-0.02em`, tabular).
   - **Name + severity dot** (14px/600, `-0.01em`, ellipsis) over **meta** ("8,204 viol · 92% days", 11px `rgba(245,243,238,.4)`, tabular). Severity dot 7px, tier color, `box-shadow:0 0 8px COL`.
   - **Sparkline** — 56×22 SVG, smoothed path, stroke = tier color 1.6px, `opacity:.85`. Per-card series:
     1 `[4,5,6,8,11,14,16,13,12]` · 2 `[3,4,6,9,12,15,13,11,10]` · 3 `[5,6,7,8,10,11,12,10,9]` · 4 `[4,5,6,7,9,10,9,8,8]` · 5 `[3,4,5,6,7,8,7,7,6]`.
   - **Selected/expanded card:** background `rgba(255,255,255,.07)`, border `rgba(122,162,255,.3)` (`transition:.3s`). Reveals (with `kb-fade .35s`) a block above a `1px solid rgba(255,255,255,.07)` divider: three rows — "Avg severity" → `sev / 5`; "Peak window" → "09:30 – 11:00"; "Recoverable" → recover% (in `#7AA2FF`) — each 12px, label `rgba(245,243,238,.5)` / value 600. Plus a full-width button "Assign enforcement team" (`padding:10px; border-radius:12px; background:rgba(122,162,255,.14); color:#7AA2FF; 12.5px/600`). Default expanded card on load: rank 1.

### 2. Insights / 3. Methodology (placeholder views)
When the segmented control isn't on Operations, the Operations content is replaced by a centered block (`position:absolute; inset:66px 0 0 0; display:grid; place-items:center; animation:kb-fade .4s`): kicker (13px/600 uppercase `0.16em`, `#7AA2FF`), title (30px/600, `-0.02em`, warm white), body (14px/1.65, `rgba(245,243,238,.5)`, max-width 440), and a glass "← Back to Operations" button. Copy:
- **Insights** — kicker "Insights", title "City-scale congestion narrative", body "A deep editorial read of where, when and why parking violations choke Bengaluru — hour-by-hour rhythms, beat leaderboards and recoverable-time modelling."
- **Methodology** — kicker "Methodology", title "How the impact score is built", body "Impact = volume × severity × persistence × junction proximity, normalised 0–100. Every input is auditable down to the source citation and confidence flag."

## Interactions & Behavior
- **Segmented control:** clicking Operations/Insights/Methodology sets the active page; the indicator pill slides (`transform translateX`, `.42s cubic-bezier(.34,1.4,.5,1)`); content swaps with a fade.
- **Hotspot click:** sets the selected hotspot → other hotspots dim to 0.4, the selected dot scales ×1.18 and brightens, and a **floating glass detail panel** springs in at `left:360px; top:96px; width:300px` (`background:rgba(20,23,29,.72); border-radius:24px; backdrop-filter:blur(28px); box-shadow:0 24px 70px rgba(0,0,0,.55)`) with `animation:kb-spring .5s cubic-bezier(.34,1.4,.5,1)` (scale .92+translateY 8px+opacity 0 → settled). Panel contents: severity dot + "HIGH/MEDIUM/LOW IMPACT" label (tier color), name (19px/600), big impact number (52px/600, `-0.03em`) + "IMPACT SCORE", a 3-cell stat strip (Violations / Severity / Days, `rgba(255,255,255,.06)` hairline grid, `border-radius:14px`), and an action sentence ("Deploy a 2-officer enforcement window **09:30–11:00** to recover an estimated **{recover}** of peak congestion."). A circular **×** close button (28px) clears the selection.
- **Board card click:** toggles expand for that card (clicking the open one collapses it). Only one expanded at a time.
- **Layer chips:** single-select; sets active layer (visual only in the prototype — wire to actual map layers in production).
- **Slider:** updates the live "minimum impact" value; in production, filters which hotspots render.
- **Play/pause** in the scrubber toggles glyph + active styling (animation hook for a time-of-day playback in production).

### Motion tokens (keyframes)
- `kb-pulse` — scale 0.85→2.4, opacity .55→0 (hotspot rings; per-spot duration 2.6–3.8s).
- `kb-breathe` — opacity 0.9↔1, 3.4s (hotspot dots).
- `kb-spring` — scale .92 + translateY 8px + opacity 0 → settled (detail panel entrance, `.5s cubic-bezier(.34,1.4,.5,1)`).
- `kb-fadeup` — opacity 0 + translateY 10px → settled (panels, `.5s ease`).
- `kb-fade` — opacity 0→1 (page swaps, expand reveal).
- `kb-drift` — translate(0)→(-1.5%,-1%)→(0), 34s (map parallax).
- Honor `prefers-reduced-motion` — disable the looping pulse/breathe/drift.

## State Management
- `page`: `'ops' | 'insights' | 'methodology'` (default `'ops'`).
- `layer`: `'hotspots' | 'density' | 'deploy'` (default `'hotspots'`).
- `minImpact`: number 0–90 (default 18).
- `spotId`: selected hotspot id or `null` (default `null`) — drives dimming + detail panel.
- `cardId`: expanded board-card id or `null` (default `1`).
- `playing`: boolean (default `true`).

Derived: selected spot object from `spotId`; per-card ring dash array from `impact`; chart paths from the hour/series arrays. **Data fetching:** none in the prototype — all data is static and should be swapped for the real hotspots/metrics API.

## Design Tokens
**Colors**
- Background: `#0B0D10` (base), `#111318` (alt surface tone).
- Detail-panel surface: `rgba(20,23,29,.72)`.
- Glass surface: `rgba(255,255,255,.04)` (cards), `rgba(255,255,255,.05)`–`.07` (controls/active/expanded).
- Borders: `rgba(255,255,255,.08)` (default), `rgba(122,162,255,.3–.4)` (active/selected).
- Text (warm white): `#F5F3EE`; muted `rgba(245,243,238,.55/.5/.4/.36/.32/.3)`.
- Primary accent: warm white `#F5F3EE`. Secondary accent: muted blue `#7AA2FF` (+ fills `rgba(122,162,255,.14/.16/.18/.34)`).
- Severity: low `#8A93A0`, medium `#E3B341`, high / critical `#FF6B5E`.

**Typography** — stack `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif` (Inter loaded as web-font fallback; SF Pro on Apple). **No serif.** Numbers use `font-variant-numeric:tabular-nums`. Scale: hero metric 52px/600 (`-0.03em`); stat 34px/600 (`-0.025em`); page title 30px/600; name/title 14–19px/600; body 12.5–14px/400–500; meta 11–11.5px; labels 9–11px/500–600 uppercase, letter-spacing 0.06–0.16em.

**Radius:** pills/controls 10–14px; cards 22px; detail panel & "24px glass" components 24px; circular dots/rings 50%.

**Blur:** `backdrop-filter:blur(20px)` standard glass; `12px` top bar; `28px` detail panel.

**Shadow:** cards `0 6px 30px rgba(0,0,0,.28)`; overlays `0 8px 30–34px rgba(0,0,0,.35–.4)`; detail panel `0 24px 70px rgba(0,0,0,.55)`; brand tile `0 2px 12px rgba(0,0,0,.4)`.

**Spacing:** panel insets 20px; panel↔top 82px; card gap 14px; stat-grid gap 12px; card padding 16–20px; control gaps 7–10px.

## Charts
Both the area chart and sparklines smooth a numeric array into an SVG path using **Catmull-Rom → cubic Bézier** (tension 1/6). Algorithm (from `support.js` logic):
1. Map each value to a point: `x = padX + i/(n-1)·(W-2·padX)`, `y = padTop + (1 - v/max)·(H - padTop - padBot)`.
2. For each segment, control points `c1 = p1 + (p2-p0)/6`, `c2 = p2 - (p3-p1)/6`; emit `C c1 c2 p2`.
3. Area = line path + `L lastX,bottom L firstX,bottom Z`, filled with the blue vertical gradient.

Reproduce with any equivalent monotone/Catmull spline (e.g. d3 `curveCatmullRom` / `curveMonotoneX`). Area-chart box `280×78` (pad 2/6/6); sparkline `56×22` (pad 1/3/3); scrubber `220×20`.

## Assets
- **No image/icon files.** The "K" brand mark is a text glyph; play/pause are unicode glyphs (`❚❚` / `▶`); all dots, rings, sparklines, and the area chart are inline SVG/CSS. Fonts come from Google Fonts (Inter) with SF Pro via system stack.
- **Map:** the prototype's map is CSS-only. In production substitute a real dark map provider (Mapbox/MapLibre/deck.gl, satellite-dark, grid/labels minimized) and project the hotspot lat/lngs instead of the x%/y% placeholders.

## Files
- `Kerbline Dashboard.dc.html` — the full design reference (template markup + `Component` logic with all data, styles, and interactions). Read this for any exact value not captured above.
- `support.js` — the in-house runtime that renders the `.dc.html`. **Reference only** — not needed in the target app.
