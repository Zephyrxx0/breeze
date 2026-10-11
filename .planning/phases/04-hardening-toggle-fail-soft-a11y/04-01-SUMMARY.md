# Phase 04-01 Summary: Sensitive Profile Toggle & Honest Fail-Soft States

**Completed:** 2026-10-11  
**Requirements Satisfied:** UAX-01, ASM-03, ASM-04

---

## 1. What Was Executed

### Task 04-01-01: Sensitive Profile Toggle & Zero-Refetch Recomputation (UAX-01)
- **State & Persistence:** Added `profile` state (`"standard"` | `"sensitive"`) in `App.tsx` initialized synchronously from `localStorage.getItem("breeze:profile")` (defaulting to `"standard"` if unset or invalid).
- **Zero-Refetch Pipeline:** Implemented `handleProfileChange` which writes to `localStorage` and updates React state without invalidating TanStack Query or making any network requests.
- **Dynamic Decision Pipeline:** Passed `profile` to `VerdictHero` and `buildTips(..., profile)` in `assessmentDetails` `useMemo`.
- **VerdictHero UI:**
  - Mounted segmented pill control for `"Standard"` and `"Sensitive group"` directly in the hero header.
  - Linked explanatory caption (*"Lower thresholds for asthma, elderly, children & respiratory sensitivity"*) using `aria-describedby="profile-desc"`.
  - Recomputed today's verdict (`verdictFor(todayCategory, profile)`) and reason lines (`reasonLines({ ..., profile })`) immediately client-side.
  - Recomputed tomorrow's forecast verdict when model data is present.

### Task 04-01-02: Honest Fail-Soft Badging & Degraded Views (ASM-03, ASM-04)
- **Stale Cache Badging:** Enhanced `ReadingBadge.tsx` to display a warm amber badge: `Cached {age}m ago` with tooltip and explicit subtext explaining that live data timed out.
- **Total Air Failure:** `App.tsx` detects `!data?.air?.current` or `data.air.status === 'unavailable'` or network error, rendering `ErrorCard` with an accessible `Retry` button. Zero fabricated numbers or synthetic verdicts.
- **Station-Only Mode:** When `data.air.model?.hourly` is empty or missing:
  - `VerdictHero` disables Tomorrow tab with an inline warning (*"Forecast model temporarily unavailable"*).
  - `ForecastChart` and `BestWindowChip` are cleanly hidden.
- **Model-Only Mode:** Clearly labeled as *"Regional model estimate (~45 km)"* with a Low confidence chip.
- **Weather Failure:** When `data.weather.status === "unavailable"`, `WeatherStrip` cleanly unmounts without interrupting air assessment.

### Task 04-01-03: Comprehensive Test Coverage
- Created `apps/web/src/test/profile-toggle.test.tsx` verifying default standard state, caption, client-side recomputation, mask/inhaler tip adjustments, and asserting 0 `fetch` calls during profile change.
- Created `apps/web/src/test/failsoft.test.tsx` verifying ErrorCard on total air failure, stale amber badge, station-only degrade warning and tab lock, and model-only labeling.
- All 14 test suites and 74 unit tests pass cleanly across `@breeze/core`, `@breeze/api`, and `@breeze/web`.
- `pnpm --filter @breeze/web build` compiles with zero errors.

---

## 2. Key Files Modified
- `apps/web/src/App.tsx`
- `apps/web/src/components/VerdictHero.tsx`
- `apps/web/src/components/ReadingBadge.tsx`
- `apps/web/src/components/ErrorCard.tsx`
- `apps/web/src/test/profile-toggle.test.tsx`
- `apps/web/src/test/failsoft.test.tsx`
- `apps/web/vite.config.ts`

---

## 3. Verification Commands
- `pnpm test`: 14 passed (74 tests)
- `pnpm --filter @breeze/web build`: Clean production build in 166ms
