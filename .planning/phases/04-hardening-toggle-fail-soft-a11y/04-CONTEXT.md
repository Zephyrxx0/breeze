# Phase 4: Hardening — Toggle, Fail-Soft & A11y - Context

**Gathered:** 2026-10-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 hardens the user experience and reliability of Breeze:
- Standard / Sensitive profile toggle with instant zero-refetch local recomputation and device persistence (`localStorage`).
- Honest fail-soft states: total failure ErrorCard with Retry (zero fake numbers), stale cache badging with clear age indicators, and graceful partial degrades (station-only vs model-only).
- WCAG AA accessibility compliance: color never the sole indicator (Text + PM2.5 + Icon triad), contrast-validated tokens (≥4.5:1), polite ARIA live announcements for verdict and scrub, full keyboard navigation with unified high-contrast focus rings, and `prefers-reduced-motion` overrides.
- Lighthouse accessibility score ≥ 90.

**Explicitly NOT in this phase:** Public AWS URL deployment (Phase 3), 1080×1350 PNG share card / saved places (Phase 5), and FIRMS fire heuristic (P2 / v2).

</domain>

<decisions>
## Implementation Decisions

### Sensitive Profile Toggle & UI Placement
- **D-01:** **VerdictHero Placement** — The Standard/Sensitive toggle lives directly on the VerdictHero card right above or beside the Today/Tomorrow segmented tabs, providing immediate visual proximity to the verdict and reasons that recompute when clicked.
- **D-02:** **Segmented Pill Control** — Implemented as a segmented pill button control ("Standard" | "Sensitive group") visually mirroring the Today/Tomorrow segmented control with clean active pill states.
- **D-03:** **Local Synchronous Persistence** — Stored in device-local `localStorage` under key `breeze:profile` ("standard" | "sensitive"), defaulting to "standard" if unset, loaded synchronously before render to avoid UI flash.
- **D-04:** **Explanatory Caption** — Rendered with a subtle caption directly beneath the toggle: *"Lower thresholds for asthma, elderly, children & respiratory sensitivity"*, linked to the toggle container via `aria-describedby`.
- **D-05:** **Zero Network Refetch** — Flipping profile recalculates verdict, reasons, and tips purely client-side via `@breeze/core` (`verdictFor(category, profile)` and `buildTips(..., profile)`). Zero network requests are fired.

### Fail-Soft States & Degraded Views
- **D-06:** **Stale Cache Badging** — When air quality data is served from a cache fallback (`air.status === 'stale'`), display a prominent warm amber pill badge *"Cached Xm ago"* directly on the reading card with an explicit tooltip/subtext stating that upstream live data timed out.
- **D-07:** **Total Air Failure State** — When air quality data fails completely (`air.status === 'unavailable'` or network error), render the dedicated `ErrorCard` with *"Can't assess right now — live upstream air data is temporarily unavailable"* and a prominent `Retry` button. Zero synthetic numbers or fallback verdicts are rendered.
- **D-08:** **Station-Only Degradation** — When an OpenAQ station succeeds but the CAMS model fails, render the Today verdict and station reading cleanly; hide ForecastChart, BestWindow chip, and Tomorrow tab, with an inline note: *"Forecast model temporarily unavailable"*.
- **D-09:** **Model-Only Degradation** — When no station is available, render the full experience (Today, Tomorrow, 48h chart, best window, tips) labelled honestly as *"Regional model estimate (~45 km)"* with a Low confidence chip.
- **D-10:** **Clean Weather Degradation** — If weather upstream fails, hide the `WeatherStrip` entirely while the air assessment remains uninterrupted.

### Screen Reader & ARIA Strategy
- **D-11:** **Polite Verdict Announcements** — An `aria-live="polite"` region on the verdict card announces upon initial load and tab switch: `"[Today/Tomorrow]: [Verdict], PM2.5 [X] µg/m³, [Category], [Top reason]"`.
- **D-12:** **Profile Switch Announcement** — Toggling profile triggers a polite live announcement: `"Profile updated to Sensitive group. Recalculated verdict: [New Verdict]"`.
- **D-13:** **ForecastChart Scrub Debouncing** — Arrow key scrubbing on the ForecastChart announces data points debounced at 100–150ms: `"[Day] [Hour]: [PM2.5] µg/m³, [Category]"` (e.g. *"Today 4:00 PM: 64 µg/m³, Moderate"*).
- **D-14:** **Global Announcer Region** — A dedicated visually-hidden region (`<span className="sr-only" aria-live="polite" aria-atomic="true">`) at the top of the main container handles notifications and routing messages.

### WCAG AA Contrast & Focus Ring System
- **D-15:** **Contrast Audit & Darkened Text Hues** — Audit all text against WCAG AA standards (≥4.5:1 normal text, ≥3:1 large/UI). Use deep text hues (e.g. `emerald-950`, `amber-950`, `rose-950`) against soft tinted backgrounds.
- **D-16:** **Unified High-Contrast Focus Ring** — Standardize focus indicators across all interactive elements (buttons, inputs, tabs, chart points): `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2`.
- **D-17:** **Non-Color Signals Triad** — Every category and verdict indicator features the complete triad: Category Name (Text) + Numerical PM2.5 (µg/m³) + Distinct Semantic Icon (Checkmark / Alert / Hazard) alongside color.
- **D-18:** **Reduced Motion Support** — Explicit CSS `@media (prefers-reduced-motion: reduce)` rules disable skeleton pulse animations and enforce instant jumps for SVG tooltips and tab transitions.

### the agent's Discretion
Downstream agents retain discretion on exact icon choices (Lucide SVG variants for icons), specific micro-transition curves for focus rings, and minor layout padding adjustments for mobile viewports.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product specifications & core contracts
- `PRD.md` §7 — Decision logic: categories (§7.1), verdict matrix (§7.2), effective PM2.5 & confidence (§7.3), tip rules (§7.5).
- `PRD.md` §10 & §11 — Architecture & component structure.
- `PRD.md` §16 — Quality & accessibility requirements (WCAG AA, Lighthouse accessibility ≥ 90).
- `docs/adr/0001-decision-logic-in-the-browser.md` — Decision logic in client bundle via `@breeze/core` enabling instant toggle.
- `docs/adr/0002-no-database-state-in-url.md` — Client persistence in `localStorage`.

### Existing implementation & packages
- `packages/core/src/index.ts` — Core decision functions supporting profiles (`verdictFor(category, profile)`, `buildTips(..., profile)`).
- `apps/web/src/components/VerdictHero.tsx` — Hero component to receive profile toggle & ARIA live announcements.
- `apps/web/src/components/ForecastChart.tsx` — SVG chart with keyboard scrubbing to receive debounced ARIA announcements and reduced-motion handling.
- `apps/web/src/styles/tokens.css` — Tailwind v4 design tokens to be verified for WCAG AA contrast.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@breeze/core`: `verdictFor` and `buildTips` already accept profile parameter (`"standard" | "sensitive"`).
- `apps/web/src/components/ErrorCard.tsx`: Dedicated error component ready for total-failure handling with `onRetry`.
- `apps/web/src/components/ReadingBadge.tsx`: Existing source badge and confidence chip component ready for stale badging.
- `apps/web/src/components/ForecastChart.tsx`: Keyboard navigation already implemented via Left/Right arrow keys with SVG focus.

### Established Patterns
- Client-side calculation via `useMemo` in `App.tsx` responding to state changes without network roundtrips.
- Segmented control UI styling in `VerdictHero.tsx` for Today/Tomorrow tabs.
- Fail-soft handling inspecting `status === 'ok' | 'stale' | 'unavailable'`.

### Integration Points
- `apps/web/src/App.tsx`: Lift/manage profile state (`useState` initialized from `localStorage`), passing down to `VerdictHero`, `buildTips`, and `ForecastChart`.
- `apps/web/src/components/VerdictHero.tsx`: Mount segmented toggle control, render explanation caption, and emit polite ARIA announcements.
- `apps/web/src/components/ForecastChart.tsx`: Debounce scrub announcement and wire reduced motion styles.
- `apps/web/src/styles/tokens.css`: Add WCAG AA contrast token overrides and unified focus ring utility classes.

</code_context>

<specifics>
## Specific Ideas

- Segmented toggle: Clean pill tabs ("Standard" / "Sensitive group") placed directly in `VerdictHero`.
- Non-color signals: Always pairing category colors with clear icons (e.g. checkmark for Good, alert circle for Moderate/Take Care, alert triangle/shield for Stay Indoors).
- Announcer: Hidden live region at top level for reliable screen reader output without visual clutter.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed strictly within Phase 4 hardening scope.

</deferred>

---

*Phase: 4-Hardening — Toggle, Fail-Soft & A11y*
*Context gathered: 2026-10-11*
