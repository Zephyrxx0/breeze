# Phase 2: Web P0 — Search, Verdict & Forecast - Context

**Gathered:** 2026-10-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers the full, client-side P0 user experience in `apps/web` connected to the live `/api/assess` backend delivered in Phase 1:
- Place search (India-only geocoding type-ahead with 300ms debounce, up to 8 results) and "Use my location" with reverse-geocode friendly labels.
- URL-driven state machine (`?lat=..&lon=..&name=..`) driving TanStack Query fetching.
- Full Verdict Card (hero layout, Today/Tomorrow tabs, headline, top-2 reasons, current PM2.5 in µg/m³, station vs model source badge, and High/Medium/Low confidence chip).
- Rule-driven tip checklist (max 5, priority-ordered, each citing the value that triggered it) and best-window highlight chip.
- 48-hour SVG forecast chart with subtle CPCB category bands, "Now" marker, night tint shading, tooltip popover, and keyboard accessibility (Left/Right arrows with aria-live announcements).
- Loading skeletons preserving layout dimensions to prevent layout shifts.
- Fail-soft states: total-failure Retry card with zero numbers/verdicts when air fails; weather strip hides cleanly when weather is unavailable; stale cache fallback explicitly badged with age.
- Provenance footer bar with place-local "Updated hh:mm" timestamp, per-source timestamps, and mandatory CC BY 4.0 attribution links (CAMS, Open-Meteo, OpenAQ).

**Explicitly NOT in this phase:** Public AWS deployment (Phase 3), Sensitive profile toggle & WCAG AA audit (Phase 4), PNG share card & saved places (Phase 5), NASA FIRMS fire heuristic (P2/v2).

</domain>

<decisions>
## Implementation Decisions

### Search & Location UX
- **D-01:** **URL as single source of truth** — Selecting a search result or completing geolocation pushes/replaces URL query parameters (`?lat=..&lon=..&name=..`). TanStack Query reads directly from URL parameters, ensuring deep-linkable and bookmarkable state by construction. — **Reversibility:** costly — changing state routing model affects search, sharing, and deep links across the app.
- **D-02:** **Debounce and Dropdown** — 300ms debounce on input; queries Open-Meteo Geocoding for `count=8` and defensively filters `country_code === "IN"`. Results dropdown appears below input, rendering `Name, Admin1 (State)`, dismisses on outside click, and supports arrow key / Enter navigation.
- **D-03:** **Geolocation Error Handling** — When GPS permission is denied or times out, display an inline non-intrusive banner directly beneath the search input ("Location access denied or timed out. Please type a city above.") and auto-focus the search input. If coordinates resolve outside India (lat 6–38, lon 68–98.5), show "Breeze covers India".
- **D-04:** **Active Place Display** — The search input displays the currently active place's label (e.g. "Connaught Place, Delhi"), clearing automatically on focus for fast, friction-free re-searching.

### Forecast Chart Visuals & Interaction
- **D-05:** **Responsive SVG Scaling** — Hand-crafted SVG chart with a responsive `viewBox="0 0 600 220"` that scales cleanly to container width, maintaining legibility down to 360px mobile viewports without horizontal page overflow.
- **D-06:** **CPCB Category Bands** — The chart background features subtle horizontal tinted bands corresponding to CPCB NAQI thresholds ([0,30] Good green, (30,60] Satisfactory light green, (60,90] Moderate yellow, (90,120] Poor orange, (120,250] Very Poor red, >250 Severe purple) with faint boundary lines.
- **D-07:** **Now Marker & Night Shading** — A vertical dashed line clearly marks "Now" on the 48-hour timeline. Semi-transparent dark tint rectangles shade night intervals (derived from daily sunset/sunrise or 20:00–06:00 local time).
- **D-08:** **Keyboard Accessibility (WCAG AA)** — SVG chart container is keyboard-focusable (`tabIndex={0}`). Left and Right arrow keys scrub through hourly data points, updating an interactive tooltip popover and announcing the hour, PM2.5, and category via an `aria-live` region.

### Verdict Card, Reading & Provenance
- **D-09:** **Verdict Card Layout** — Hero card layout featuring a prominent verdict headline (*Good to go* / *Take care* / *Stay indoors if you can*), segmented control toggle tabs for Today / Tomorrow, and the two pre-formatted reason lines from `@breeze/core` rendered directly beneath.
- **D-10:** **Source Badge Styling** — Station reading renders `Station: [Name] (X km away, Ym ago)` with a status dot. Regional model estimate renders `Regional model estimate (~45 km)` with an informational tooltip/subtext.
- **D-11:** **Confidence Chip** — Semantic confidence chip displayed beside the source badge: `High confidence` (green) when station ≤5 km & <1 h old, `Medium confidence` (blue/neutral) when station ≤25 km, and `Low confidence` (muted amber) for regional model estimates.
- **D-12:** **Provenance Footer Bar** — Sticky or bottom page footer displaying "Updated hh:mm" in place-local wall clock time, distinct timestamps for Air and Weather sources, and required CC BY 4.0 attribution links to CAMS, Open-Meteo, and OpenAQ.

### Loading Skeletons & Fail-soft States
- **D-13:** **Pulsing Skeletons** — Subtle animated pulsing skeleton placeholders matching the dimensions of the hero card, chart rectangle, and tip list while queries are in-flight, preventing Cumulative Layout Shift (CLS).
- **D-14:** **Clean Weather Degradation** — If the weather upstream fails (`weather.status === "unavailable"`), the weather strip component hides completely, while the air quality verdict, chart, and air-related tips render uninterrupted.
- **D-15:** **Stale Cache Badging** — When air quality data is served from a cache fallback (`air.status === "stale"`), display a prominent amber badge "Stale (cached Xm ago)" on the verdict card and footer timestamp, while still calculating and displaying the verdict from the cached data.
- **D-16:** **Total Failure State** — When air quality is completely unavailable or HTTP errors occur, render a full-width card: *"Can't assess right now — live upstream data is temporarily unavailable"* with a prominent Retry button. Never render a fallback verdict word, synthetic number, or mock fixture.

### the agent's Discretion
Downstream agents retain flexibility on exact CSS animation timing/easings for skeleton pulses and chart hover transitions, exact Tailwind spacing utilities, and minor helper icon choices (e.g. Lucide/SVG icons for wind, humidity, rain).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product specifications & core contracts
- `PRD.md` §7 — Decision logic: categories (§7.1), verdict matrix (§7.2), effective PM2.5 & confidence (§7.3), best window (§7.4), tip rules (§7.5).
- `PRD.md` §8 — Data sources: Open-Meteo Geocoding, Air Quality, Forecast, BigDataCloud reverse geocode, and upstream terms/attribution.
- `PRD.md` §10 & §11 — Architecture & repository modules: `apps/web` components structure (`SearchBox`, `LocationButton`, `VerdictCard`, `ForecastChart`, `BestWindow`, `TipList`, `WeatherStrip`, `ProvenanceBar`).
- `PRD.md` §12 — API specification: GET `/api/assess` `AssessResponse` schema (status flags `ok` | `stale` | `unavailable`).
- `docs/adr/0001-decision-logic-in-the-browser.md` — Verdict, best window, and tips run in client bundle via `@breeze/core`.
- `docs/adr/0002-no-database-state-in-url.md` — No database: place state in URL query params.

### Existing implementation & packages
- `packages/core/src/index.ts` — Exported pure-TS decision logic (`categoryFor`, `verdictFor`, `reasonLines`, `bestWindow`, `buildTips`, `formatTip`, `confidenceFor`, `wallFromInstant`).
- `apps/web/src/lib/geocode.ts` — Existing geocoding helpers (`searchPlaces`, `reverseGeocode`).
- `apps/api/src/assessSchema.ts` — Zod schema defining the exact JSON payload returned by `/api/assess`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@breeze/core`: Complete, tested pure-TS library providing `categoryFor`, `verdictFor`, `reasonLines`, `bestWindow`, `buildTips`, `formatTip`, `confidenceFor`, `wallFromInstant`.
- `apps/web/src/lib/geocode.ts`: Ready-to-use Open-Meteo Geocoding (`searchPlaces`) and BigDataCloud reverse geocoding (`reverseGeocode`) functions with India bounding box filtering.
- `apps/web/src/main.tsx`: Walking skeleton demonstrating successful import of `@breeze/core` and live fetching from `/api/assess`.

### Established Patterns
- Tailwind CSS v4 CSS-first config with `@theme` in `apps/web/src/styles/tokens.css` or `index.html`.
- TanStack Query v5 for reactive server data caching, stale handling, and retries.
- Fail-soft pattern: components inspect `status === 'ok' | 'stale' | 'unavailable'` and adjust UI accordingly without throwing errors.

### Integration Points
- `apps/web/src/main.tsx` will be replaced/refactored into `App.tsx` hosting `QueryClientProvider`, URL parameter router listener, search bar, verdict hero, forecast chart, and provenance footer.
- Local dev proxy or Vite config `server.proxy` pointing `/api` to local Hono dev server on port 8787.

</code_context>

<specifics>
## Specific Ideas

- Search input: 300ms debounce, auto-clearing text on focus, auto-focus on geolocation failure.
- SVG Chart: Hand-written SVG, viewBox 600x220, category bands matching CPCB colours, Left/Right arrow key navigation for keyboard accessibility.
- Honest provenance: "Updated hh:mm" in local time with clear attribution links to CAMS, Open-Meteo, and OpenAQ.

</specifics>

<deferred>
## Deferred Ideas

- Sensitive profile toggle and WCAG AA accessibility audit (Phase 4).
- 1080x1350 PNG share card with html-to-image and saved place chips (Phase 5).
- NASA FIRMS fire detection heuristic panel (P2 / v2).

</deferred>

---

*Phase: 2-Web P0 — Search, Verdict & Forecast*
*Context gathered: 2026-10-11*
