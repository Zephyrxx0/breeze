# Summary: Plan 02-03 — 48-Hour Accessible SVG Forecast Chart

**Phase:** 02-web-p0-search-verdict-forecast
**Plan:** 03
**Status:** Completed

## Outcomes & Artifacts

1. **Responsive SVG Forecast Chart (`ForecastChart.tsx`):**
   - Built a hand-crafted, zero-dependency SVG chart with `viewBox="0 0 600 220"` that scales cleanly to mobile viewports down to 360px without layout distortion.
   - Dynamic PM2.5 Y-scale mapping (floored at 130 µg/m³ so Good through Poor bands remain visible even in clean air, and scaling dynamically up to peak model values).
   - Horizontal CPCB NAQI category background bands (Good: `#10b981`, Satisfactory: `#84cc16`, Moderate: `#f59e0b`, Poor: `#f97316`, Very Poor: `#ef4444`, Severe: `#b91c1c`) tinted at subtle opacity (~0.08) with dashed threshold lines and numerical value labels on the Y-axis.
   - Night shading: semi-transparent dark tint rectangles for night hours (hours < 06:00 or >= 20:00 local wall clock).
   - Vertical dashed marker for "Now" positioned at the closest hourly point to current local wall clock time.
   - 6-hour interval X-axis time ticks along the bottom.

2. **Interactive Tooltip (`ForecastTooltip.tsx`):**
   - Interactive pointer tracking and touch scrubbing across the 48-hour timeline.
   - Positions a floating popover showing formatted local time (e.g. "Today, 6 PM" / "Tomorrow, 9 AM"), PM2.5 in µg/m³, and category pill badge.
   - Prevents tooltip overflow off horizontal chart boundaries.

3. **WCAG AA Keyboard Accessibility:**
   - Chart container is keyboard-focusable (`tabIndex={0}`, `role="region"`, descriptive `aria-label`).
   - Arrow keys (`ArrowLeft`, `ArrowRight`) scrub backward and forward through hours with clamping.
   - `Home` and `End` keys jump to start and end of forecast.
   - `aria-live="polite"` region announces active hourly time, PM2.5 value, and category for screen readers.

4. **Unit Tests & Test Suite Integration (`chart.test.ts`, `vitest.config.ts`):**
   - Added 12 unit tests in `apps/web/test/chart.test.ts` verifying:
     - `yForPm25` coordinate scaling (0 to bottom, max to top, midpoints, clamp over max, zero handling).
     - `xForIndex` coordinate scaling (start, end, midpoint, single-element safeguard).
     - `getCpcbBands` generation (valid geometry, CPCB thresholds, filtering).
     - `clampIndex` keyboard bounds clamping.
   - Updated root `vitest.config.ts` to include `apps/web` in test projects.

## Verification

- `pnpm test` passes all 11 test suites (63/63 tests green across `@breeze/core`, `@breeze/api`, and `@breeze/web`).
- `pnpm --filter @breeze/web build` succeeds in 207ms (115.29 kB gzipped JS, 6.99 kB gzipped CSS, comfortably within the 200 kB budget).

