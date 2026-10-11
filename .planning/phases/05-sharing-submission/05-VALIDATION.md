---
phase: "05"
slug: sharing-submission
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-11
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.3 |
| **Config file** | `vitest.config.ts` (workspace root), `apps/web/vite.config.ts` |
| **Quick run command** | `pnpm --filter @breeze/web test` |
| **Full suite command** | `pnpm test` |
| **Multi-TZ command** | `pnpm test:tz` |
| **Estimated runtime** | ~1.3 seconds |

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
| 05-01-01 | 01 | 1 | SHR-01 | — | Deep link URL generated with 2-dp coords, copied with toast feedback | unit | `pnpm --filter @breeze/web test sharing-features` | ✅ | ✅ green |
| 05-01-02 | 01 | 1 | SHR-03 | T-05-01 | 5-place ceiling enforced, XSS-safe place names, localStorage persistence | unit | `pnpm --filter @breeze/web test sharing-features` | ✅ | ✅ green |
| 05-01-03 | 01 | 1 | SHR-04 | — | Accessible Dialog with ESC key close, focus trap, body scroll lock | unit | `pnpm --filter @breeze/web test sharing-features` | ✅ | ✅ green |
| 05-02-01 | 02 | 2 | SHR-02 | T-05-02 | Share card renders fixed 1080x1350 px layout off-screen | unit | `pnpm --filter @breeze/web test share-card` | ✅ | ✅ green |
| 05-02-02 | 02 | 2 | SHR-02 | T-05-03 | Double-capture loop, Web Share with download + link copy fallback | unit | `pnpm --filter @breeze/web test share-card` | ✅ | ✅ green |
| 05-02-03 | 02 | 2 | SHR-02 | — | Share card button disabled when verdict unavailable | unit | `pnpm --filter @breeze/web test share-card` | ✅ | ✅ green |
| 05-03-01 | 03 | 3 | Process Gate | — | Comprehensive README with architecture and reproducible run steps | docs/lint | `test -f README.md && grep -q 'System Architecture' README.md` | ✅ | ✅ green |
| 05-03-02 | 03 | 3 | Process Gate | — | Submission writeup with AI disclosures and timed video demo script | docs/lint | `test -f SUBMISSION.md && test -f docs/VIDEO_WALKTHROUGH.md` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing test infrastructure in `@breeze/web` (`sharing-features.test.tsx`, `share-card.test.tsx`) covers all requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Native Web Share Sheet on physical mobile | SHR-02 | Automated tests mock `navigator.share` / `navigator.canShare`; native OS share sheet rendering is hardware-specific | On an iPhone or Android phone, tap "Share Card" and inspect the opened OS share sheet |
| 1080×1350 PNG rasterization quality | SHR-02 | Unit tests verify `html-to-image` invocation and Blob creation; raster output crispness is visual | Open generated `.png` on high-DPI display, check font rendering and borders |

---

## Validation Sign-Off

- [x] All tasks have automated tests or documentation lint checks
- [x] Sampling continuity: test suite runs in ~1.3 seconds
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-11
