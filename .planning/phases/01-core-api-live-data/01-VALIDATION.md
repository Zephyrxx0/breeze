---
phase: 1
slug: core-api-live-data
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-11
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.0.3 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test && pnpm test:tz && pnpm smoke` |
| **Estimated runtime** | ~5 seconds (unit) / ~15 seconds (smoke) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test && pnpm test:tz`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | — | T-01-01 | Secrets stay in local .env, never committed | config | `git status --ignored` | ✅ | ✅ green |
| 01-02-01 | 02 | 2 | DEC-04 | T-01-02 | Host-TZ immune wall-clock arithmetic | unit | `pnpm test:tz` | ✅ packages/core/test/wallclock.test.ts | ✅ green |
| 01-02-02 | 02 | 2 | — | — | Exact NAQI category bands and sub-index | unit | `pnpm test packages/core/test/category.test.ts` | ✅ packages/core/test/category.test.ts | ✅ green |
| 01-02-03 | 02 | 2 | — | — | Distance and bearing geo calculations | unit | `pnpm test packages/core/test/geo.test.ts` | ✅ packages/core/test/geo.test.ts | ✅ green |
| 01-03-01 | 03 | 3 | DEC-01 | — | 12-cell matrix and reason lines in core | unit | `pnpm test packages/core/test/verdict.test.ts` | ✅ packages/core/test/verdict.test.ts | ✅ green |
| 01-03-02 | 03 | 3 | DEC-02 | — | Cleanest 3h window with >=15% improvement | unit | `pnpm test packages/core/test/window.test.ts` | ✅ packages/core/test/window.test.ts | ✅ green |
| 01-03-03 | 03 | 3 | DEC-03 | — | PRD §7.5 verbatim rule-driven tips | unit | `pnpm test packages/core/test/tips.test.ts` | ✅ packages/core/test/tips.test.ts | ✅ green |
| 01-04-01 | 04 | 4 | — | T-01-04 | Upstream 4s abort controller timeouts | unit | `pnpm test apps/api/test/clients.test.ts` | ✅ apps/api/test/clients.test.ts | ✅ green |
| 01-05-01 | 05 | 5 | ASM-04 | T-01-05 | Two-stage zod param & bbox validation | unit | `pnpm test apps/api/test/assess.test.ts` | ✅ apps/api/test/assess.test.ts | ✅ green |
| 01-05-02 | 05 | 5 | ASM-04 | T-01-06 | Fail-soft upstream degradation without fake numbers | integration | `pnpm test apps/api/test/failsoft.test.ts` | ✅ apps/api/test/failsoft.test.ts | ✅ green |
| 01-06-01 | 06 | 6 | ASM-04, DEC-01 | — | Multi-place live smoke with blackholes | e2e / live | `pnpm smoke` | ✅ scripts/smoke-live.ts | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-11

