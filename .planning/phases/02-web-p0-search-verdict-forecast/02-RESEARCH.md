# Phase 2: Web P0 — Search, Verdict & Forecast - Research

**Researched:** 2026-10-11
**Domain:** React SPA / TanStack Query / SVG Data Visualization / Fail-Soft UX
**Confidence:** HIGH

## Summary

Phase 2 builds the complete P0 user experience for Breeze in `apps/web`. It transitions the walking skeleton into a polished, responsive web application that connects place search, geolocation, live data fetching from `/api/assess`, and client-side decision logic (`@breeze/core`).

The architecture strictly honors the core project philosophy: **fail soft, never fake**. State management is anchored in URL query parameters (`?lat=..&lon=..&name=..`), which allows instant deep-linking, browser history navigation, and zero server-side session overhead. TanStack Query v5 orchestrates data caching and background refetches with fail-soft tolerance. The 48-hour forecast chart is implemented as a lightweight, hand-crafted responsive SVG component with CPCB category bands, local night shading, and full WCAG AA keyboard operability.

**Primary recommendation:** Use URL search parameters as the single source of truth for location; wire TanStack Query v5 with `staleTime: 5 * 60 * 1000` and `retry: 1`; compose the UI out of modular components (`SearchBox`, `VerdictCard`, `ForecastChart`, `BestWindow`, `TipList`, `WeatherStrip`, `ProvenanceBar`); and render all verdicts and strings directly via `@breeze/core`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Geocoding / Search | Browser / Client | — | Direct client call to Open-Meteo Geocoding (no keys needed; filtered to `IN`) |
| Reverse Geocoding | Browser / Client | — | Direct client call to BigDataCloud (fallback to "Your location") |
| Assessment Data Fetching | Browser / Client | API / Backend | Client calls `/api/assess`; backend aggregates upstreams and caches in TTL cache |
| Decision Engine (Verdict, Window, Tips) | Browser / Client | — | Executed client-side via `@breeze/core` (ADR-0001) for instant reactive updates |
| Forecast Visualization | Browser / Client | — | Hand-crafted SVG component with accessible DOM nodes and ARIA live regions |
| Provenance & Attribution | Browser / Client | — | Renders upstream timestamps and mandatory CC BY 4.0 licenses in footer |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01: URL as single source of truth** — Selecting a search result or completing geolocation pushes/replaces URL query parameters (`?lat=..&lon=..&name=..`). TanStack Query reads directly from URL parameters, ensuring deep-linkable and bookmarkable state by construction. — **Reversibility:** costly
- **D-02: Debounce and Dropdown** — 300ms debounce on input; queries Open-Meteo Geocoding for `count=8` and defensively filters `country_code === "IN"`. Results dropdown appears below input, rendering `Name, Admin1 (State)`, dismisses on outside click, and supports arrow key / Enter navigation.
- **D-03: Geolocation Error Handling** — When GPS permission is denied or times out, display an inline non-intrusive banner directly beneath the search input ("Location access denied or timed out. Please type a city above.") and auto-focus the search input. If coordinates resolve outside India (lat 6–38, lon 68–98.5), show "Breeze covers India".
- **D-04: Active Place Display** — The search input displays the currently active place's label (e.g. "Connaught Place, Delhi"), clearing automatically on focus for fast, friction-free re-searching.
- **D-05: Responsive SVG Scaling** — Hand-crafted SVG chart with a responsive `viewBox="0 0 600 220"` that scales cleanly to container width, maintaining legibility down to 360px mobile viewports without horizontal page overflow.
- **D-06: CPCB Category Bands** — The chart background features subtle horizontal tinted bands corresponding to CPCB NAQI thresholds ([0,30] Good green, (30,60] Satisfactory light green, (60,90] Moderate yellow, (90,120] Poor orange, (120,250] Very Poor red, >250 Severe purple) with faint boundary lines.
- **D-07: Now Marker & Night Shading** — A vertical dashed line clearly marks "Now" on the 48-hour timeline. Semi-transparent dark tint rectangles shade night intervals (derived from daily sunset/sunrise or 20:00–06:00 local time).
- **D-08: Keyboard Accessibility (WCAG AA)** — SVG chart container is keyboard-focusable (`tabIndex={0}`). Left and Right arrow keys scrub through hourly data points, updating an interactive tooltip popover and announcing the hour, PM2.5, and category via an `aria-live` region.
- **D-09: Verdict Card Layout** — Hero card layout featuring a prominent verdict headline (*Good to go* / *Take care* / *Stay indoors if you can*), segmented control toggle tabs for Today / Tomorrow, and the two pre-formatted reason lines from `@breeze/core` rendered directly beneath.
- **D-10: Source Badge Styling** — Station reading renders `Station: [Name] (X km away, Ym ago)` with a status dot. Regional model estimate renders `Regional model estimate (~45 km)` with an informational tooltip/subtext.
- **D-11: Confidence Chip** — Semantic confidence chip displayed beside the source badge: `High confidence` (green) when station ≤5 km & <1 h old, `Medium confidence` (blue/neutral) when station ≤25 km, and `Low confidence` (muted amber) for regional model estimates.
- **D-12: Provenance Footer Bar** — Sticky or bottom page footer displaying "Updated hh:mm" in place-local wall clock time, distinct timestamps for Air and Weather sources, and required CC BY 4.0 attribution links to CAMS, Open-Meteo, and OpenAQ.
- **D-13: Pulsing Skeletons** — Subtle animated pulsing skeleton placeholders matching the dimensions of the hero card, chart rectangle, and tip list while queries are in-flight, preventing Cumulative Layout Shift (CLS).
- **D-14: Clean Weather Degradation** — If the weather upstream fails (`weather.status === "unavailable"`), the weather strip component hides completely, while the air quality verdict, chart, and air-related tips render uninterrupted.
- **D-15: Stale Cache Badging** — When air quality data is served from a cache fallback (`air.status === "stale"`), display a prominent amber badge "Stale (cached Xm ago)" on the verdict card and footer timestamp, while still calculating and displaying the verdict from the cached data.
- **D-16: Total Failure State** — When air quality is completely unavailable or HTTP errors occur, render a full-width card: *"Can't assess right now — live upstream data is temporarily unavailable"* with a prominent Retry button. Never render a fallback verdict word, synthetic number, or mock fixture.

### the agent's Discretion
Downstream agents retain flexibility on exact CSS animation timing/easings for skeleton pulses and chart hover transitions, exact Tailwind spacing utilities, and minor helper icon choices (e.g. Lucide/SVG icons for wind, humidity, rain).

### Deferred Ideas (OUT OF SCOPE)
- Sensitive profile toggle and WCAG AA accessibility audit (Phase 4).
- 1080x1350 PNG share card with html-to-image and saved place chips (Phase 5).
- NASA FIRMS fire detection heuristic panel (P2 / v2).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLC-01 | Place search with India-only type-ahead (≥2 chars, 300 ms debounce, max 8 results with name + state) | Open-Meteo Geocoding API (`searchPlaces` in `apps/web/src/lib/geocode.ts`) with debounce hook and dropdown component |
| PLC-02 | Tap "Use my location", current assessment, denied/timeout inline message, outside India bounds notice | Browser Geolocation API + India bbox check (lat 6–38, lon 68–98.5) + inline warning banner |
| PLC-03 | Friendly name for GPS locations via reverse geocoding, fallback to "Your location" without blocking data | BigDataCloud reverse geocode client (`reverseGeocode` in `apps/web/src/lib/geocode.ts`) parallel/non-blocking |
| ASM-01 | Single /api/assess fetch render with skeletons, independent section status (ok/stale/unavailable) | TanStack Query v5 fetcher hook reading URL params; independent rendering guards for `data.air` and `data.weather` |
| ASM-02 | Current PM2.5 in µg/m³ with category, source badge (station name/distance/age or model), confidence chip | `@breeze/core` (`categoryFor`, `confidenceFor`) + semantic styling |
| FCT-01 | 48-hour PM2.5 chart with category bands, now marker, night shading, tooltip, readable at 360px with keyboard focus | Hand-written SVG component using viewBox `0 0 600 220`, linear scaling, keydown handlers, and ARIA live updates |
| FCT-02 | Weather strip (feels-like, humidity, UV now + max, rain chance) hiding entirely when unavailable | Conditional render on `data.weather && data.weather.status !== 'unavailable'` |
| FCT-03 | Provenance footer: "Updated hh:mm", per-source timestamps and attribution crediting CAMS/Open-Meteo + OpenAQ | Format timestamps using `@breeze/core` `wallFromInstant` with `location.utcOffsetSeconds`; CC BY 4.0 link anchors |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.3.0 | UI Framework | Component-based view rendering; already installed in workspace |
| @breeze/core | workspace:* | Decision Engine | Pure TypeScript logic for verdict, categories, window, tips; verified in Phase 1 |
| @tanstack/react-query | 5.104.1 | Data Fetching & Caching | Industry standard for async state management, automatic deduplication, retry, and stale handling |
| Tailwind CSS | 4.3.3 | Styling | Fast CSS-first styling via tokens in `@theme` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 1.16.0 | Icons | Semantic UI icons (search, location pin, wind, droplet, sun, umbrella, check, alert) |
| clsx / tailwind-merge | 2.1.1 / 3.4.0 | Class composition | Conditional utility classes for category tints and status badges |

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| @tanstack/react-query | npm | 6 yrs | 65M/wk | github.com/TanStack/query | [OK] | Approved (pinned in STACK.md) |
| lucide-react | npm | 4 yrs | 109M/wk | github.com/lucide-icons/lucide | [OK] | Approved |
| clsx | npm | 6 yrs | 126M/wk | github.com/lukeed/clsx | [OK] | Approved |
| tailwind-merge | npm | 3 yrs | 86M/wk | github.com/dcastil/tailwind-merge | [OK] | Approved |

*Note: The seam flag `too-new` reflects recent release tags on npm; all listed packages are multi-year, trusted core ecosystem dependencies verified in `STACK.md`.*

## Architecture Patterns

### URL-as-State Flow

```
User Action (Search / Geolocation / Deep Link)
               │
               ▼
Update Window URL Query Params (?lat=28.61&lon=77.21&name=New%20Delhi)
               │
               ▼
useSearchParams / URL Observer Hook
               │
               ▼
useQuery(['assess', lat, lon], fetchAssessment)
               │
      ┌────────┴────────┐
      ▼                 ▼
Loading State     Success / Error State
 (Skeletons)            │
                        ├─► VerdictCard (@breeze/core verdictFor, reasonLines)
                        ├─► BestWindow & TipList (@breeze/core bestWindow, buildTips)
                        ├─► ForecastChart (48-h SVG with CPCB bands)
                        ├─► WeatherStrip (if status !== 'unavailable')
                        └─► ProvenanceBar (timestamps + CC BY 4.0 links)
```

### Component Structure
```
apps/web/src/
├── components/
│   ├── SearchBox.tsx           # Input with debounce, geocode dropdown, error banner
│   ├── LocationButton.tsx      # GPS trigger with loading and error states
│   ├── VerdictHero.tsx         # Today/Tomorrow verdict card, headline, reasons
│   ├── ReadingBadge.tsx        # PM2.5 reading, station vs model badge, confidence chip
│   ├── BestWindowChip.tsx      # Cleanest 3-hour window fact chip
│   ├── TipList.tsx             # Rule-driven tips list (max 5)
│   ├── ForecastChart.tsx       # 48-hour accessible SVG chart
│   ├── WeatherStrip.tsx        # Feels-like, humidity, UV, rain (fail-soft hide)
│   ├── ProvenanceFooter.tsx    # "Updated hh:mm", per-source times, CAMS/OpenAQ attribution
│   ├── Skeletons.tsx           # Pulsing loading skeleton wireframes
│   └── ErrorCard.tsx           # "Can't assess right now" with Retry button
├── hooks/
│   ├── useLocationParams.ts    # Reads/writes URL search parameters
│   └── useAssessment.ts        # TanStack Query hook wrapping /api/assess
├── lib/
│   ├── api.ts                  # Fetch client for /api/assess
│   └── geocode.ts              # Existing searchPlaces & reverseGeocode
├── styles/
│   └── tokens.css              # Theme tokens & CPCB category color variables
└── App.tsx                     # Main layout shell
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Data Caching & Dedup | Custom useEffect/useState cache | TanStack Query v5 | Handles race conditions, background refresh, retry delays, and cache lifecycles |
| Category/Verdict Logic | Duplicate switch statements in UI | `@breeze/core` | Already unit-tested across all CPCB boundaries; prevents frontend/backend drift |
| Time calculations | `new Date(openMeteoString)` | `@breeze/core` `wallFromInstant` | Open-Meteo returns wall-clock strings without offset; parsing in browser TZ corrupts day boundaries |
| Chart libraries | Recharts or Chart.js | Hand-written SVG | Eliminates heavy bundles (>150KB) and ensures 100% control over mobile scaling and accessibility |

## Common Pitfalls

### Pitfall 1: Browser Timezone Drift
- **What goes wrong:** Using standard JavaScript `new Date()` or `.getHours()` on Open-Meteo time strings parses them in the viewer's local browser timezone (e.g. UTC in a test runner or US Pacific), misaligning Today/Tomorrow day boundaries and sunset/sunrise markers.
- **Prevention:** Always use `@breeze/core` wall-clock utilities (`wallFromInstant`, `parseWallClock`, `formatWallTime`) and respect `location.utcOffsetSeconds`.

### Pitfall 2: Cumulative Layout Shift (CLS) on Load
- **What goes wrong:** Skeletons that do not match the rendered card heights cause the page to jump violently when the API responds.
- **Prevention:** Skeletons must mirror exact component heights: Verdict Hero (~180px), Forecast Chart (~240px), Tips List (~160px).

### Pitfall 3: Broken Keyboard Scrubbing on SVG Charts
- **What goes wrong:** Screen readers and keyboard-only users cannot access SVG data points because individual circles or paths lack focusability or accessible labels.
- **Prevention:** Give the SVG container `tabIndex={0}`, listen to `onKeyDown` for `ArrowLeft`/`ArrowRight`, and update an `aria-live="polite"` element with `"Hour: {time}, PM2.5: {val} µg/m³, Category: {cat}"`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.3 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| PLC-01 | Type-ahead debounce and India filtering | unit | `pnpm --filter @breeze/web test` |
| PLC-02 | Geolocation error messaging & bounds validation | unit | `pnpm --filter @breeze/web test` |
| ASM-01 | Query state handling & skeletons | unit | `pnpm --filter @breeze/web test` |
| ASM-02 | Category, source badge & confidence rendering | unit | `pnpm --filter @breeze/web test` |
| FCT-01 | SVG chart scales cleanly and formats data points | unit | `pnpm --filter @breeze/web test` |
| FCT-02 | Weather strip hides on unavailable | unit | `pnpm --filter @breeze/web test` |
| FCT-03 | Provenance footer displays local time & attribution | unit | `pnpm --filter @breeze/web test` |

## Sources
### Primary (HIGH confidence)
- `PRD.md` §7, §8, §10, §11, §12
- `packages/core/src/index.ts` — verified decision engine exports
- `.planning/phases/02-web-p0-search-verdict-forecast/02-CONTEXT.md` — user locked decisions
- `.planning/research/STACK.md` — verified dependencies and upstream contracts

### Secondary (MEDIUM confidence)
- TanStack Query v5 documentation for React 19 compatibility

