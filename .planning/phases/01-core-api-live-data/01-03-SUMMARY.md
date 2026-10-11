# Summary: 01-03 @breeze/core Decision Layer

**Status:** Completed
**Date:** 2026-10-11

## Delivered

- `packages/core/src/verdict.ts`: Implemented 12-cell verdict matrix resolution, exactly two number-first reason lines with extras precedence, `next6hPeakWorse` evaluation, and the `tomorrowTab` derivation with the station-only null guard.
- `packages/core/src/effective.ts`: Implemented PRD §7.3 effective PM2.5 selection ladder (filtering, median of nearest 3 within 10 km, nearest within 25 km, model fallback, null when all absent) and confidence grade determination.
- `packages/core/src/window.ts`: Implemented `bestWindow` with the 15% improvement threshold, 3-hour sliding duration over 05:00-21:00 inclusive, and the station-only null guard on empty/missing series.
- `packages/core/src/tips.ts`: Implemented `buildTips` and `formatTip` per PRD §7.5 rules verbatim with D-03 cite prefix, priority sorting, top-5 capping, and A3 auto-suppression when window mean >= 91 µg/m³ or window is null.
- `packages/core/src/index.ts`: Exported complete public surface of `@breeze/core`.

## Verification

- `verdict.test.ts`: Verified all 12 cells of the verdict matrix, reason lines formatting and extras precedence, and Tomorrow tab derivation with peak identification and station-only degrade lock (`tomorrowTab([], ...)` returns null).
- `effective.test.ts`: Verified median-of-nearest-3 selection, nearest selection, distance/age filtering, model fallback, and confidence grading.
- `window.test.ts`: Verified cleanest 3-hour window detection, 15% threshold suppression, flat series handling, and station-only degrade lock (`bestWindow([], ...)` returns null).
- `tips.test.ts`: Verified all rule triggers, A3 suppression, UV wording shifts, top-5 priority ordering, and cite-prefixed formatting.
- Monorepo test suite for `@breeze/core` runs green and byte-identically under both `TZ=UTC` and `TZ=Asia/Kolkata` (DEC-04 invariant).
- Zero occurrences of "AQI" in `packages/core/src`.
