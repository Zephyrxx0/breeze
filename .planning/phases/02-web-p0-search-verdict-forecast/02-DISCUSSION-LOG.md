# Phase 2: Web P0 — Search, Verdict & Forecast - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-11
**Phase:** 02-Web P0 — Search, Verdict & Forecast
**Areas discussed:** Search & Location UX, Forecast Chart Visuals & Interaction, Verdict Card, Reading & Provenance, Loading Skeletons & Fail-soft States

---

## Search & Location UX

| Option | Description | Selected |
|--------|-------------|----------|
| URL as single source of truth | updating input or geolocation pushes/replaces URL query params (?lat=..&lon=..&name=..), and TanStack Query reads directly from URL | ✓ |
| Local component state with sync | local state drives query immediately, synced to window.history.replaceState without reloading | |
| You decide | planner picks standard idiomatic React/TanStack pattern | |

**User's choice:** URL as single source of truth

| Option | Description | Selected |
|--------|-------------|----------|
| 300ms debounce with min 2 chars | show dropdown below input with 'Name, State', keyboard arrow/enter navigation, and click-outside dismissal | ✓ |
| 200ms faster debounce | immediate first 8 results and clear button | |
| You decide | planner picks debounce timing | |

**User's choice:** 300ms debounce with min 2 chars

| Option | Description | Selected |
|--------|-------------|----------|
| Inline banner / helper text | under search input ('Location access denied / timed out. Please type a city above.') and auto-focus search input | ✓ |
| Toast / alert banner | at the top of the screen | |
| You decide | planner picks error presentation | |

**User's choice:** Inline banner / helper text under search input and auto-focus

| Option | Description | Selected |
|--------|-------------|----------|
| Keep search input in sync | reflects current place label, clearing on focus for easy new searches | ✓ |
| Separate permanent header badge | search input is purely an action bar / search modal | |
| You decide | planner picks input display | |

**User's choice:** Keep search input in sync with current place label

---

## Forecast Chart Visuals & Interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Responsive viewBox | (e.g. viewBox="0 0 600 220") scaling to container width, fitting 360px+ screens without scroll | ✓ |
| Fixed scrollable SVG | container min-width 640px allowing horizontal scroll | |
| You decide | planner picks SVG scaling approach | |

**User's choice:** Responsive viewBox

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle background bands | horizontal bands tinted with CPCB colors (Good to Severe) + subtle threshold lines | ✓ |
| Neutral background | colored forecast line segments matching CPCB bands | |
| You decide | planner picks visual styling | |

**User's choice:** Subtle background horizontal bands tinted with CPCB colors

| Option | Description | Selected |
|--------|-------------|----------|
| 'Now' line + night tint | Vertical dashed marker labelled 'Now' + semi-transparent dark tint rects for local night hours | ✓ |
| 'Now' marker only | no night shading | |
| You decide | planner picks timeline markers | |

**User's choice:** Vertical dashed 'Now' line + dark tint rects for local night hours

| Option | Description | Selected |
|--------|-------------|----------|
| Tab-stop on SVG | Left/Right arrow keys cycling through hourly data points, updating active tooltip + aria-live readout | ✓ |
| Standard HTML buttons/slider | below chart for keyboard users | |
| You decide | planner picks a11y implementation | |

**User's choice:** Tab-stop on SVG with Left/Right arrow scrubbing and aria-live readout

---

## Verdict Card, Reading & Provenance

| Option | Description | Selected |
|--------|-------------|----------|
| Hero verdict card | prominent headline ('Good to go' / 'Take care' / 'Stay indoors'), Today/Tomorrow segment tabs, top-2 reasons beneath | ✓ |
| Two separate cards | headline in one, reasons/details in another | |
| You decide | planner picks layout | |

**User's choice:** Hero verdict card with headline, Today/Tomorrow tabs, top-2 reasons

| Option | Description | Selected |
|--------|-------------|----------|
| Detailed badge | Station: 'Station: [Name] (3 km away, 25m ago)' with status dot; Model: 'Regional model estimate (~45 km)' | ✓ |
| Compact pill badge | '[Name] · 3km' or 'CAMS Model' with expandable details | |
| You decide | planner picks badge style | |

**User's choice:** Detailed badge naming station/distance/age or regional model estimate

| Option | Description | Selected |
|--------|-------------|----------|
| Beside source badge | Semantic chip: High (green), Medium (blue/neutral), Low (muted amber) | ✓ |
| Small dot indicator | with tooltip explaining criteria | |
| You decide | planner picks chip style | |

**User's choice:** Semantic confidence chip beside source badge

| Option | Description | Selected |
|--------|-------------|----------|
| Page footer bar | 'Updated hh:mm' (local wall clock), separate timestamps for Air and Weather, CC BY 4.0 attribution links to CAMS, Open-Meteo & OpenAQ | ✓ |
| Minimal attribution line | timestamps in popover sheet | |
| You decide | planner picks footer layout | |

**User's choice:** Page footer bar with 'Updated hh:mm', separate timestamps, and CC BY 4.0 links

---

## Loading Skeletons & Fail-soft States

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle pulsing skeletons | wireframes for hero card, chart rectangle, tips list preserving layout height to avoid CLS | ✓ |
| Single centered spinner | with 'Fetching live assessment...' text | |
| You decide | planner picks loading state | |

**User's choice:** Subtle pulsing skeleton wireframes preserving layout height

| Option | Description | Selected |
|--------|-------------|----------|
| Hide weather strip entirely | when weather is unavailable; air section remains visible and functional | ✓ |
| Placeholder strip | saying 'Weather temporarily unavailable' | |
| You decide | planner picks partial failure display | |

**User's choice:** Hide weather strip entirely when weather is unavailable

| Option | Description | Selected |
|--------|-------------|----------|
| Prominent amber badge | 'Stale (cached Xm ago)' at top of verdict card and timestamp; verdict still rendered from cached data | ✓ |
| Subtle text annotation | in footer only | |
| You decide | planner picks stale badging | |

**User's choice:** Prominent amber badge 'Stale (cached Xm ago)' on verdict card and timestamp

| Option | Description | Selected |
|--------|-------------|----------|
| Full-width error card | 'Can\'t assess right now — live upstream data is temporarily unavailable' with prominent Retry button; zero numbers or verdicts shown | ✓ |
| Error card with popular cities | quick-pick cities to try instead | |
| You decide | planner picks error layout | |

**User's choice:** Full-width error card with Retry button and zero fabricated numbers or verdicts

---

## the agent's Discretion

Downstream agents retain flexibility on exact CSS animation timing/easings for skeleton pulses and chart hover transitions, exact Tailwind spacing utilities, and minor helper icon choices (e.g. Lucide/SVG icons for wind, humidity, rain).

## Deferred Ideas

- Sensitive profile toggle and WCAG AA accessibility audit (Phase 4).
- 1080x1350 PNG share card with html-to-image and saved place chips (Phase 5).
- NASA FIRMS fire detection heuristic panel (P2 / v2).

