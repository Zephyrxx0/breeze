# Phase 5 Plan 01: Deep-Link, Saved Places & About Modal — Summary

**Execution Date:** 2026-10-11  
**Status:** Completed  
**Requirements Addressed:** SHR-01, SHR-03, SHR-04  

---

## 1. What was built

### Canonical Deep Link & Toast Notification (SHR-01 / D-14 / D-15)
- Created `apps/web/src/components/Toast.tsx`:
  - Accessible floating bottom-center overlay with `role="status"` and `aria-live="polite"`.
  - Auto-dismisses after 2500ms with checkmark icon and entrance animation.
- Updated `apps/web/src/components/VerdictHero.tsx`:
  - Added Share & Copy Link button group directly below reason lines.
  - "Copy Link" constructs canonical `${window.location.origin}/?lat=${lat2}&lon=${lon2}&n=${encodeURIComponent(name)}` with 2-dp coordinates and triggers clipboard write.
  - Surfaces non-blocking toast and screen-reader announcements on copy.

### Saved Places Bar (SHR-03 / D-06..D-09)
- Created `apps/web/src/hooks/useSavedPlaces.ts`:
  - Synchronous hydration from `localStorage.getItem("breeze:saved-places")` with error handling.
  - Enforces strict 5-place ceiling with `{ action: "limit_reached" }` when attempting a 6th place.
  - Supports `isCurrentSaved`, `toggleSaveCurrent()`, and `removePlace(place)`.
- Created `apps/web/src/components/SavedPlacesBar.tsx`:
  - Horizontal scrollable pill strip beneath Search & Location bar.
  - Visual active state highlighting matching current location within 0.02° (~2.2 km).
  - Discrete (X) icon on each chip with explicit `aria-label` to remove saved places.
- Updated `apps/web/src/components/SearchBox.tsx`:
  - Added bookmark icon toggle inside the search input to save/unsave current location with toast feedback.

### Accessible About & Data Sources Modal (SHR-04 / D-10..D-12)
- Created `apps/web/src/components/AboutModal.tsx`:
  - Accessible Dialog modal with backdrop blur, focus trap on open, keyboard `Escape` dismissal, and body scroll lock.
  - 4 educational sections:
    1. Plain Verdicts & PM2.5 (Why not AQI?)
    2. Ground Stations vs. Regional Model (~45 km CAMS)
    3. Honest Confidence Ratings (High / Medium / Low)
    4. Data Providers & Licensing (Copernicus CAMS, Open-Meteo, OpenAQ, BigDataCloud, CC BY 4.0) + Medical disclaimer.
- Updated `apps/web/src/App.tsx`:
  - Added "About" button in header top-right with info icon.
- Updated `apps/web/src/components/ProvenanceFooter.tsx`:
  - Added "Learn how Breeze measures air quality & data sources →" trigger link opening the modal.

---

## 2. Verification & Test Coverage
- Created `apps/web/src/test/sharing-features.test.tsx`:
  - Toast dismissal lifecycle and auto-dismiss timer.
  - SavedPlacesBar empty state, chip rendering, active state border highlighting within 0.02°, selection callback, and discrete removal callback.
  - AboutModal rendering with all 4 sections, ESC key close, and close button click.
- Fixed upstream mock timestamp in `apps/api/test/failsoft.test.ts` to ensure station-only degrade test runs with valid fresh readings.
- All 16 test files (89 tests) passed cleanly across `@breeze/core`, `@breeze/api`, and `@breeze/web`.

