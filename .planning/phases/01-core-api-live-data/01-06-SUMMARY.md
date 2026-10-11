# Summary: 01-06 Live Smoke Script & Walking-Skeleton Proof

**Status:** Completed
**Date:** 2026-10-11

## Delivered

- `scripts/smoke-live.ts`:
  - Self-contained orchestrator that self-spawns server instances (normal :8788, OpenAQ-blackhole :8789, Air-blackhole :8790).
  - Validates live responses for 4 Indian places (Delhi, Bengaluru, Jaipur, Jaisalmer) spanning metro, tier-2, and small-town categories against `AssessResponseSchema`.
  - Asserts model-only degrade path against blackholed OpenAQ (`10.255.255.1`).
  - Asserts station-only degrade path against blackholed Open-Meteo Air.
  - Verifies out-of-India 400 rejection (`out_of_coverage`) and live geocoding for Indian cities.
  - Exits 0 under coverage-independent pass bar.
- `apps/web/vite.config.ts`: Configured same-origin development proxy `/api` pointing to `http://localhost:8787`.
- `apps/web/src/main.tsx`: Walking skeleton debug component fetching live `/api/assess`, running `@breeze/core` in the client bundle (category, verdict, number-first reason lines, cleanest window, and tips), and rendering "Can't assess right now" (zero verdict words) on failure.
- `.planning/phases/01-core-api-live-data/SKELETON.md`: Signed off the "Stack Touched in Phase 1" checklist.

## Verification

- `pnpm smoke` exited 0 with all live verifications passing and printed the station vs model mix summary table.
- `pnpm test` and `pnpm test:tz` passed across all 10 suites (51 tests) under both `TZ=UTC` and `TZ=Asia/Kolkata`.
- `pnpm --filter @breeze/web build` succeeded without errors.
- Failure branch honesty check passed (`! grep -rniE "good to go|take care|stay indoors" apps/web/src/main.tsx`).
- Human verification gate approved.
