# Summary: 01-02 @breeze/core Foundation

**Status:** Completed
**Date:** 2026-10-11

## Delivered

- `packages/core/src/types.ts`: Defined the full foundation and decision contracts (`Category`, `Profile`, `Verdict`, `Confidence`, `WallClock`, `HourPoint`, `StationReading`, `EffectivePm25`, `Tip`, `BestWindow`, `ReasonLinesInput`, `PlaceSearchResult`).
- `packages/core/src/config.ts`: Established the single source of truth for CPCB continuous half-open breakpoint bands, the 12-cell verdict matrix, window thresholds, and verbatim tips.
- `packages/core/src/category.ts`: Implemented `categoryFor` without rounding before classification, and `subIndex` adhering to CPCB linear interpolation anchors with the 500 cap for PM2.5 >= 500 and the golden pairs (31->51, 60->100).
- `packages/core/src/wallclock.ts`: Implemented host-timezone immune wall-clock utilities (`parseWall`, `wallFromInstant`, `wallAddHours`, `hourLabel`).
- `packages/core/src/geo.ts`: Implemented `haversineKm`, `bearingDeg`, and `isUpwind`.
- `packages/core/src/index.ts`: Re-exported all foundation modules.

## Verification

- `category.test.ts` verified exact CPCB boundaries (30/30.1, 60/60.1, 90/90.1, 120/120.1, 250/250.1), monotonicity across 0..600, error handling, and golden pairs (31->51, 60->100).
- `wallclock.test.ts` verified byte-identical output across `process.env.TZ` mutations ("UTC", "America/New_York", "Asia/Kolkata") and hour calculations.
- `geo.test.ts` verified Haversine distance and bearing for Delhi-Jaipur within defined tolerances (distance ~240 km, bearing ~225°) and 45° upwind checks.
- Zero string-based `new Date()` calls exist in `packages/core/src`.
- Zero occurrences of "AQI" exist in `packages/core/src`.
