# Summary: Plan 02-02 — Verdict Hero, Reading Badge, Tips, Weather Strip & Provenance Footer

**Phase:** 02-web-p0-search-verdict-forecast
**Plan:** 02
**Status:** Completed

## Outcomes & Artifacts

1. **Verdict Hero & Today/Tomorrow Tabs (`VerdictHero.tsx`):**
   - Implemented segmented control toggle between "Today" and "Tomorrow".
   - Computes live actionable headline verdict (*Good to go* / *Take care* / *Stay indoors if you can*) using `@breeze/core` `categoryFor`, `verdictFor`, and `reasonLines`.
   - Computes tomorrow's daytime mean (06:00–20:00 local wall clock) and identifies peak pollution hour across all 24 hours of tomorrow from `air.model.hourly`.
   - Surfaces top-2 plain-language reason lines beneath the headline.

2. **Honest Reading Badge (`ReadingBadge.tsx`):**
   - Displays PM2.5 in large type with "µg/m³" and CPCB category pill badge (Good to Severe).
   - Source provenance badge: displays either "Station: [Name] (X km away, Ym ago)" with station distance and age, or "Regional model estimate (~45 km)".
   - Semantic confidence chip: High (green), Medium (blue), or Low (amber).
   - Amber "Stale cached" badge when `air.status === "stale"`.

3. **Cleanest 3-Hour Window (`BestWindowChip.tsx`):**
   - Evaluates `@breeze/core` `bestWindow` over local daytime hours (05:00–21:00).
   - Renders highlight chip when improvement ≥ 15%: "Cleanest 3-Hour Window: {start} to {end} (averaging {X} µg/m³, {Y}% lower)".
   - Suppresses outdoor encouragement phrasing when window average is Poor or worse (≥91 µg/m³).
   - Renders null cleanly when no window passes the 15% threshold.

4. **Actionable Rule-Driven Tips (`TipList.tsx`):**
   - Calls `@breeze/core` `buildTips` with current PM2.5, window context, UV index, feels-like temperature, and 6-hour rain probability.
   - Formats up to 5 priority-ordered tips using `formatTip`, citing triggering value first.

5. **Fail-Soft Weather Strip (`WeatherStrip.tsx`):**
   - Displays feels-like temperature (°C), humidity (%), UV index (current + daily max), and rain chance (%).
   - Completely hides if weather data is unavailable or missing, without breaking or blocking air quality sections.

6. **Provenance & Attribution Footer (`ProvenanceFooter.tsx`):**
   - Renders place-local "Updated at hh:mm (local time)" using `@breeze/core` `wallFromInstant` and `location.utcOffsetSeconds`.
   - Displays distinct timestamps for Air quality and Weather upstreams.
   - Mandated CC BY 4.0 attribution links to CAMS, Open-Meteo, and OpenAQ.
   - General guidance / medical disclaimer.

7. **Integration & Core Types (`App.tsx`, `packages/core/src/types.ts`):**
   - Mounted all components within `assessment-content` in `App.tsx`.
   - Exported `AssessResponse` interface from `@breeze/core`.

## Verification

- `pnpm --filter @breeze/web build` passes in 177ms (112.95 kB gzipped JS, 6.13 kB gzipped CSS, well within <200 kB budget).
- `pnpm test` passes 51/51 tests across all 10 suites in `@breeze/core` and `@breeze/api`.

