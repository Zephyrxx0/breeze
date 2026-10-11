---
phase: 2
slug: web-p0-search-verdict-forecast
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-11
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.0.3 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test && pnpm --filter @breeze/web build` |
| **Estimated runtime** | ~1 second (unit) / ~200ms (build) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test && pnpm --filter @breeze/web build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | — | T-02-01 | Client build compiles tokens without CSS leakage | build | `pnpm --filter @breeze/web build` | ✅ | ✅ green |
| 02-01-02 | 01 | 1 | PLC-03 | T-02-02 | Out-of-bounds coords flagged without API calls | unit | `pnpm test apps/web/test/location.test.ts` | ✅ apps/web/test/location.test.ts | ✅ green |
| 02-01-03 | 01 | 1 | PLC-01, PLC-02, ASM-01 | — | Debounced search, GPS reverse-geocode & skeletons | build / unit | `pnpm --filter @breeze/web build` | ✅ apps/web/src/components/SearchBox.tsx | ✅ green |
| 02-02-01 | 02 | 2 | ASM-02, DEC-01 | — | Today/Tomorrow tabs, station/model badge & confidence | build / unit | `pnpm --filter @breeze/web build` | ✅ apps/web/src/components/VerdictHero.tsx | ✅ green |
| 02-02-02 | 02 | 2 | DEC-02, DEC-03 | — | 3-hour window & rule-driven tips formatting | unit | `pnpm test packages/core/test/window.test.ts packages/core/test/tips.test.ts` | ✅ apps/web/src/components/BestWindowChip.tsx | ✅ green |
| 02-02-03 | 02 | 2 | FCT-02, FCT-03 | T-02-03, T-02-04 | Fail-soft weather strip, CC BY 4.0 & disclaimer | build | `pnpm --filter @breeze/web build` | ✅ apps/web/src/components/ProvenanceFooter.tsx | ✅ green |
| 02-03-01 | 03 | 3 | FCT-01 | T-02-05 | Responsive 600x220 SVG with CPCB bands | unit | `pnpm test apps/web/test/chart.test.ts` | ✅ apps/web/test/chart.test.ts | ✅ green |
| 02-03-02 | 03 | 3 | FCT-01 | — | "Now" marker, night tint, tooltip & a11y scrubbing | unit | `pnpm test apps/web/test/chart.test.ts` | ✅ apps/web/test/chart.test.ts | ✅ green |
| 02-03-03 | 03 | 3 | FCT-01 | — | Chart integration into App with boundary tests | unit / build | `pnpm test && pnpm --filter @breeze/web build` | ✅ apps/web/src/App.tsx | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real browser GPS prompt | PLC-02 | Browser permission modal cannot be automated headless without mock | Tap "Use my location", allow prompt, verify location label updates |
| Visual band color fidelity | FCT-01 | Subjective aesthetic review | View chart at 360px viewport; check CPCB tints and night shading |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-11

