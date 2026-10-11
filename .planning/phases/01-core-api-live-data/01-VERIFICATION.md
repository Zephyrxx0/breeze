# Phase 1 Verification: Core, API & Live Data

**Phase:** 01-core-api-live-data
**Status:** PASSED
**Date:** 2026-10-11
**Requirements:** [ASM-04, DEC-01, DEC-02, DEC-03, DEC-04]

## Verification Overview

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| **ASM-04** | Fail-soft upstream degradation without fabricated numbers | PASSED | Unit tests (`failsoft.test.ts`) and live smoke (`smoke-live.ts`) prove model-only and station-only degrade paths against live and blackholed upstreams. |
| **DEC-01** | One honest verdict computed in browser via `@breeze/core` | PASSED | Full 12-cell matrix tested in `verdict.test.ts`. Walking skeleton browser render in `apps/web/src/main.tsx` runs `@breeze/core` on live API assessment. |
| **DEC-02** | Cleanest 3-hour window with >=15% improvement threshold | PASSED | Tested in `window.test.ts`; returns null below 15% and on empty/missing series (station-only lock). |
| **DEC-03** | Rule-driven tips citing triggering values verbatim from PRD §7.5 | PASSED | Tested in `tips.test.ts`; format matches cite prefix + verbatim text; A3 suppressed at >=91 or when window is null. |
| **DEC-04** | Place-local day boundaries immune to host timezone | PASSED | `pnpm test:tz` (`TZ=UTC` and `TZ=Asia/Kolkata`) passes byte-identically across all 10 suites (51 tests). Zero host-TZ Date string parsing in `@breeze/core`. |

## Phase Deliverables

1. **Workspace & Tooling (01-01):** pnpm workspace across `packages/core`, `apps/api`, `apps/web` with exact STACK.md pins, Vitest test runner, and secret hygiene (`.env` gitignored).
2. **@breeze/core Foundation (01-02):** Pure TypeScript contracts, CPCB half-open continuous bands, sub-index with golden anchors, host-TZ immune wall-clock arithmetic, and geo math.
3. **@breeze/core Decision Layer (01-03):** 12-cell verdict matrix, number-first reason lines, Tomorrow tab, effective PM2.5 ladder, best window, and rule-driven tips.
4. **API Serving & Upstream Clients (01-04):** Hono API scaffold (`/api/health`), in-memory TTL cache, SAM esbuild template, and four zod-validated upstream clients with 4 s aborts.
5. **GET /api/assess Route (01-05):** Two-stage validation (`invalid_params` vs `out_of_coverage`), 2-dp coordinate rounding, `Promise.allSettled` fan-out, per-section status, and structured logging.
6. **Live Smoke & Walking Skeleton (01-06):** Self-contained `scripts/smoke-live.ts` validating live upstreams across 4 places with blackhole assertions, Vite proxy, and browser-bundle walking skeleton.

## Automated Gates Passed

- `pnpm test` (all 10 test files, 51 tests)
- `pnpm test:tz` (TZ=UTC and TZ=Asia/Kolkata double-run)
- `pnpm smoke` (live multi-city verification with blackhole degrade assertions)
- ADR-0001 grep gate (`! grep -nE 'categoryFor|verdictFor|bestWindow|buildTips' apps/api/src/routes/assess.ts`)
- Failure branch honesty check in `apps/web/src/main.tsx`
- SKELETON.md signed off
