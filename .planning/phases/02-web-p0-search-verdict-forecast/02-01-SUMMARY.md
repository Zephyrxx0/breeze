# Summary: Plan 02-01 — Router, Search, Location, Skeletons & Fail-Soft

**Phase:** 02-web-p0-search-verdict-forecast
**Plan:** 01
**Status:** Completed

## Outcomes & Artifacts

1. **Frontend Dependencies & Styling Tokens:**
   - Installed `@tanstack/react-query@5.104.1`, `lucide-react@1.16.0`, `clsx@2.1.1`, and `tailwind-merge@3.4.0` in `apps/web`.
   - Installed `tailwindcss@4.3.3` and `@tailwindcss/vite@4.3.3`.
   - Created `apps/web/src/styles/tokens.css` with CPCB category colors mapped to `@theme` variables (`--color-cpcb-good`, `--color-cpcb-satisfactory`, `--color-cpcb-moderate`, `--color-cpcb-poor`, `--color-cpcb-very-poor`, `--color-cpcb-severe`).

2. **URL-as-State & TanStack Query:**
   - Created `apps/web/src/hooks/useLocationParams.ts` syncing `?lat=..&lon=..&name=..` with browser history and providing bounding-box validation for India (lat 6–38, lon 68–98.5).
   - Created `apps/web/src/hooks/useAssessment.ts` wrapping `useQuery` against `/api/assess` with 5-minute `staleTime`, single retry, and zero-air fail-soft guard.

3. **Search & Location UX:**
   - Created `apps/web/src/components/SearchBox.tsx`: 300ms debounce on input, queries `searchPlaces` from `apps/web/src/lib/geocode.ts` with `count=8` and defensive `country_code === "IN"`, arrow/enter keyboard navigation, click-outside dismissal, input auto-clearing on focus.
   - Created `apps/web/src/components/LocationButton.tsx`: calls `navigator.geolocation.getCurrentPosition`, reverse geocodes via `reverseGeocode` in `apps/web/src/lib/geocode.ts`, handles errors/timeouts gracefully.
   - Created `apps/web/src/components/Skeletons.tsx`: pulsing wireframe placeholders matching component layout heights to prevent CLS.
   - Created `apps/web/src/components/ErrorCard.tsx`: honest "Can't assess right now" fail-soft card with Retry button and zero fake numbers.
   - Built `apps/web/src/App.tsx` and mounted in `apps/web/src/main.tsx`.

## Verification

- `pnpm --filter @breeze/web build` succeeded cleanly (bundle size ~106 kB gzipped JS, well below 200 kB budget).
- `pnpm test` passed across all 10 test suites (51 tests).

