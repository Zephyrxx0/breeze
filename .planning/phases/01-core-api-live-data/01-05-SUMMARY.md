# Summary: 01-05 GET /api/assess Route & Fail-Soft Normalisation

**Status:** Completed
**Date:** 2026-10-11

## Delivered

- `apps/api/src/assessSchema.ts`: Defined `QueryNumericSchema` (stage 1 validation), `QueryIndiaBoundsSchema` (stage 2 validation), and `AssessResponseSchema` enforcing PRD §12 output contract.
- `apps/api/src/routes/assess.ts`:
  - Distinct 400 error codes: `invalid_params` on non-numeric or missing query params vs `out_of_coverage` on coordinates outside the India bounding box (lat 6–38, lon 68–98.5).
  - 2 decimal place coordinate rounding for cache identity (`${lat2},${lon2}`) and output location.
  - TTL cache checking before upstream fan-out (OpenAQ 15 min, Air 60 min, Forecast 30 min) and stale fallback support (≤3 hours) on upstream failures.
  - Fan-out via `Promise.allSettled` to Open-Meteo Air Quality, Forecast, and OpenAQ v3.
  - Effective PM2.5 selection via `@breeze/core`'s `selectEffectivePm25` (data-selection only).
  - Station-only degrade path: `air.model` set to `null` and comparison omitted when Open-Meteo Air is unavailable.
  - Model-only degrade path: `air.current.source === "model"` when OpenAQ is unavailable.
  - 502 `all_upstreams_failed` when all sections are unavailable and no cache exists.
  - `Cache-Control: public, max-age=300` set on all routes.
  - Structured request logging with request ID and 2-dp coordinates without logging keys.
- `apps/api/src/app.ts`: Mounted `assessRoutes` on `/api`.
- Tests:
  - `apps/api/test/assess.test.ts`: Verified query validation stages, 400 status codes, 200 response shape, and cache header.
  - `apps/api/test/failsoft.test.ts`: Hermetic blackhole fail-soft tests covering model-only degrade, station-only degrade, and 502 all-upstreams-failed.

## Verification

- `pnpm test` and `pnpm test:tz` pass green across all 10 test files and 51 tests under both `TZ=UTC` and `TZ=Asia/Kolkata`.
- Grep gate verified that `categoryFor`, `verdictFor`, `bestWindow`, and `buildTips` do not appear in `apps/api/src/routes/assess.ts` (strictly preserving ADR-0001: decision logic lives in client core).
- Zero `hono/cors` imports present in `apps/api/src`.
