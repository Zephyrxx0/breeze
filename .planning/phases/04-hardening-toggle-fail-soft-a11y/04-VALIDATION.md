---
phase: 04
slug: hardening-toggle-fail-soft-a11y
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-11
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.3 |
| **Config file** | `vitest.config.ts` (workspace root), `apps/web/vite.config.ts` |
| **Quick run command** | `pnpm --filter @breeze/web test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @breeze/web test`
- **After every plan wave:** Run `pnpm test && pnpm --filter @breeze/web build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | UAX-01 | T-04-01 | LocalStorage profile parsing falls back safely to 'standard' | unit/integration | `pnpm --filter @breeze/web test profile-toggle` | ✅ | ✅ green |
| 04-01-02 | 01 | 1 | ASM-03, ASM-04 | T-04-02 | Total air failure renders ErrorCard with retry; zero fake numbers | unit/integration | `pnpm --filter @breeze/web test failsoft` | ✅ | ✅ green |
| 04-01-03 | 01 | 1 | UAX-01, ASM-03 | T-04-03 | Zero network refetch asserted on toggle change | unit/integration | `pnpm test` | ✅ | ✅ green |
| 04-02-01 | 02 | 2 | UAX-02 | — | Non-color triad present; contrast ratio ≥ 7:1; unified focus rings | unit | `pnpm --filter @breeze/web test a11y` | ✅ | ✅ green |
| 04-02-02 | 02 | 2 | UAX-02 | T-04-05 | Polite ARIA live regions and 120ms debounced scrubbing | unit | `pnpm --filter @breeze/web test a11y` | ✅ | ✅ green |
| 04-02-03 | 02 | 2 | UAX-02 | — | Reduced-motion CSS rules disable skeleton pulse and spinning | unit/build | `pnpm test && pnpm --filter @breeze/web build` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real screen reader announcement timing | UAX-02 | Synthetic tests verify DOM `aria-live` and `role="status"`, but physical speech synthesizer pacing is verified by user | Focus chart, use arrow keys, observe spoken hour/PM2.5 rate |
| Visual clarity of focus rings on mobile viewport | UAX-02 | Synthetic tests verify CSS classes and computed styles; touch/keyboard tab appearance verified visually | Press Tab through SearchBox, buttons, tabs, chart points |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-11
