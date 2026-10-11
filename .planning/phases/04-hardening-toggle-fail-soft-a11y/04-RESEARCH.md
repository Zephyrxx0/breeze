# Phase 4: Hardening — Toggle, Fail-Soft & A11y - Research

**Researched:** 2026-10-11  
**Domain:** Client State Management / Zero-Refetch Recomputation / Fail-Soft UX / WCAG AA Accessibility / ARIA Live Regions  
**Confidence:** HIGH  

---

## Executive Summary

Phase 4 hardens Breeze to satisfy the definition of done for P0 on the live, deployed web client. It addresses three core requirements:
1. **UAX-01 (Sensitive Profile Toggle):** User can switch between Standard and Sensitive profiles. The verdict, reasons, and tips recompute immediately in the browser via `@breeze/core` with **zero network refetch** (asserted). The preference is persisted in `localStorage` under `breeze:profile` and restored synchronously on mount.
2. **ASM-03 (Honest Fail-Soft States):** When upstream data fails completely (`air.status === 'unavailable'`), Breeze renders a clean, full-width `ErrorCard` with "Can't assess right now" and a prominent `Retry` button. No numbers without sources or fabricated verdicts are ever shown. If cached data is returned (`air.status === 'stale'`), a prominent warm amber badge displays *"Cached Xm ago"* with transparent subtext. If an OpenAQ station succeeds but CAMS model data fails, the Today view degrades gracefully while cleanly hiding the ForecastChart and Tomorrow tab. If CAMS succeeds but no station is found, it labels as a regional model estimate (~45 km) with Low confidence. If weather upstream fails, `WeatherStrip` cleanly unmounts without interrupting air quality assessment.
3. **UAX-02 (WCAG AA & Accessibility):** Color is never the sole differentiator: category badges and verdicts employ a triad of **Text + PM2.5 + Semantic Icon** (e.g. Checkmark, AlertCircle, AlertTriangle, ShieldAlert). Contrast ratios across all text and badge tokens meet or exceed WCAG AA (≥4.5:1 for normal text, ≥3:1 for large UI). ARIA live regions politely announce verdict updates on initial load, tab changes, and profile switches (`"Profile updated to Sensitive group. Recalculated verdict: [New Verdict]"`), while keyboard scrubbing in `ForecastChart` debounces announcements at 100–150ms. High-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2`) are unified across all interactives, and `@media (prefers-reduced-motion: reduce)` disables pulse animations and enables instant transitions.

---

## Architectural Responsibility & State Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser / App.tsx                      │
│                                                             │
│  State:                                                     │
│  - profile: "standard" | "sensitive" (synced to localStorage)│
│  - activeTab: "today" | "tomorrow"                          │
│                                                             │
│  React Query: /api/assess (URL lat/lon)                     │
│  - Returns AssessResponse: { air, weather, location }       │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
     Zero-Refetch Recompute         Fail-Soft Orchestration
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      @breeze/core            │ │    Component Fail-Soft     │
│ - verdictFor(cat, profile)   │ │ - air === 'unavailable'    │
│ - reasonLines({..., profile})│ │   => ErrorCard + Retry     │
│ - tomorrowTab(..., profile)  │ │ - air === 'stale'          │
│ - buildTips(..., profile)    │ │   => "Cached Xm ago" pill  │
│                              │ │ - model === null           │
│ Recomputes instantly in-mem  │ │   => Hide Chart & Tomorrow │
│ Pure TS, 0 ms latency        │ │ - weather === 'unavailable'│
│                              │ │   => Hide WeatherStrip     │
└──────────────┬───────────────┘ └────────────┬───────────────┘
               │                              │
               └──────────────┬───────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   A11y Presentation Layer                    │
│                                                             │
│ - Live Announcer: <span className="sr-only" aria-live=... /> │
│ - Non-Color Triad: Text + PM2.5 + Lucide Icons               │
│ - WCAG AA Contrast Tokens: emerald-950, amber-950, rose-950 │
│ - Unified Focus Ring: focus-visible:ring-2 ring-blue-600     │
│ - Reduced Motion: prefers-reduced-motion overrides in CSS   │
└─────────────────────────────────────────────────────────────┘
```

---

## Detailed Research by Requirement Area

### 1. Sensitive Profile Toggle (UAX-01)

#### User Decisions & UX Placement (D-01 to D-05)
- **Placement:** Positioned in `VerdictHero.tsx` alongside or right above the Today/Tomorrow segmented control tabs.
- **Control Type:** Segmented pill button control with two options: `"Standard"` and `"Sensitive group"`.
- **Explanatory Caption:** Subtext beneath the pill: *"Lower thresholds for asthma, elderly, children & respiratory sensitivity"*, linked to the pill group via `aria-describedby`.
- **Persistence:** Local synchronous read from `localStorage.getItem("breeze:profile")` before initial paint, falling back to `"standard"`. Changes write immediately to `localStorage.setItem("breeze:profile", nextProfile)`.
- **Zero Network Refetch:** When the profile changes, no TanStack Query invalidation or refetch occurs. In tests, spy on `fetch` / network hooks to assert zero requests are made when switching profiles.
- **Decision Engine Propagation:**
  - `verdictFor(category, profile)` — switches Satisfactory from "Good to go" to "Take care", and Poor from "Take care" to "Stay indoors if you can".
  - `reasonLines({ ..., profile })` — updates line 2 to mention sensitive profile ("Your Sensitive profile acts at lower levels").
  - `tomorrowTab(..., profile)` — recalculates tomorrow's verdict and reason lines for the sensitive profile.
  - `buildTips(ctx, profile)` — lowers A1 mask threshold from 91 to 61 µg/m³ and activates A5 inhaler reminder at ≥31 µg/m³.

### 2. Fail-Soft States & Degraded Views (ASM-03)

#### 1. Total Air Failure (`air.status === 'unavailable'` or network error)
- If `!data?.air?.current` or `data.air.status === 'unavailable'`:
  - Render `ErrorCard`: *"Can't assess right now — live upstream air data is temporarily unavailable"*.
  - Render a prominent `Retry` button wired to TanStack Query's `refetch()`.
  - Never fabricate numbers, categories, or default verdicts.
- If network error occurs (HTTP 5xx, offline, timeout):
  - Render `ErrorCard` with the same retry action.

#### 2. Stale Cache Badging (`air.status === 'stale'`)
- When data is served from server TTL cache because live upstream timed out:
  - Display a warm amber badge on the reading card in `ReadingBadge.tsx`: `Cached Xm ago` (computed from `current.measuredAt` or cache age).
  - Include an explicit helper tooltip or subtext: *"Upstream live data timed out; showing cached data from Xm ago."*
  - Provenance footer also flags that air data is cached.

#### 3. Station-Only Degradation
- If OpenAQ station succeeds but CAMS regional model fails (`air.model === null` or `air.model.hourly.length === 0`):
  - Render Today verdict and station reading cleanly.
  - Hide `ForecastChart`, `BestWindowChip`, and the `Tomorrow` tab (disable or omit Tomorrow button in the segmented control).
  - Render an inline notice: *"Forecast model temporarily unavailable"*.

#### 4. Model-Only Degradation
- If no OpenAQ station is available (`current.source === "model"`):
  - Render full experience (Today, Tomorrow, 48h chart, cleanest window, tips).
  - Explicitly label the source badge: *"Regional model estimate (~45 km)"*.
  - Show `Low confidence` chip.

#### 5. Weather Failure Degradation
- If Open-Meteo Forecast fails (`weather.status === "unavailable"` or `weather === null`):
  - Hide `WeatherStrip` completely.
  - Omit weather-dependent tips (A6 UV, A7 heat, A8 rain) from `buildTips` while preserving all air-related tips (A1, A2, A3, A4, A5).

### 3. WCAG AA Accessibility & Design Engineering (UAX-02)

#### 1. Non-Color Signals Triad (D-17)
Every visual assessment indicator must combine three distinct sensory channels:
1. **Text:** Explicit category and verdict words ("Good", "Moderate", "Poor", "Good to go", "Take care", "Stay indoors if you can").
2. **Numeric Value:** Exact PM2.5 in µg/m³ with units.
3. **Semantic Icon:**
   - *Good / Satisfactory / Good to go:* `CheckCircle2` (emerald).
   - *Moderate / Take care:* `AlertCircle` (amber).
   - *Poor / Very Poor / Severe / Stay indoors:* `AlertTriangle` or `ShieldAlert` (rose/red).

#### 2. Color Contrast Audit (WCAG AA Compliance)
- Normal text requires ≥ 4.5:1 against its background.
- Large text (≥ 18pt or 14pt bold) and interactive UI boundaries require ≥ 3.0:1.
- Audit of current colors:
  - Light green backgrounds with light green text (e.g. `text-lime-700` on `bg-lime-50`) can fall near 4.2:1 depending on browser font smoothing.
  - Ensure all category text uses deep hues:
    - Good: `text-emerald-900` or `text-emerald-950` on `bg-emerald-50` (contrast > 7:1).
    - Satisfactory: `text-lime-950` on `bg-lime-50` (contrast > 7:1).
    - Moderate: `text-amber-950` on `bg-amber-50` (contrast > 7:1).
    - Poor: `text-orange-950` on `bg-orange-50` (contrast > 7:1).
    - Very Poor: `text-rose-950` on `bg-rose-50` (contrast > 7:1).
    - Severe: `text-red-950` on `bg-red-100` (contrast > 7:1).

#### 3. Screen Reader & Live Regions (D-11 to D-14)
- **Global / Top-level Live Announcer:**
  - `<div className="sr-only" aria-live="polite" aria-atomic="true">` to announce state changes cleanly.
- **Initial Load & Tab Switch Announcement:**
  - `"[Today/Tomorrow]: [Verdict], PM2.5 [X] µg/m³, [Category], [Top reason]"`.
- **Profile Toggle Announcement:**
  - `"Profile updated to [Standard / Sensitive group]. Recalculated verdict: [Verdict]"`.
- **Chart Keyboard Scrubbing:**
  - Arrow key navigation in `ForecastChart` must debounce announcements at 100–150ms using a timer or `useDebounce` to prevent screen reader buffer inundation. Format: `"[Today/Tomorrow] [Time]: [X] µg/m³, [Category]"`.

#### 4. Unified Focus Ring System (D-16)
- Provide a consistent, high-visibility focus ring utility or apply standard Tailwind classes to all interactive controls:
  - `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2`
  - Ensure `tabIndex={0}` and clear keyboard focus states on:
    - Search input & clear button
    - Location button
    - Segmented profile pill buttons (Standard / Sensitive)
    - Segmented tab buttons (Today / Tomorrow)
    - Retry button on ErrorCard
    - ForecastChart container and keyboard scrubber
    - All external attribution links in ProvenanceFooter

#### 5. Reduced Motion (`prefers-reduced-motion`) (D-18)
- In `tokens.css`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
    .animate-pulse {
      animation: none !important;
      opacity: 0.7 !important;
    }
  }
  ```

---

## Test Verification & Quality Strategy

To satisfy Phase 4 DoD and enable high confidence:
1. **Unit Tests (`packages/core` & `apps/web`):**
   - Assert zero network calls when profile toggles: mount with mock assessment data, switch profile, verify verdict and tips update, verify `fetch` is never called.
   - Assert `localStorage` persistence: toggle to sensitive, verify `localStorage["breeze:profile"] === "sensitive"`; simulate page reload, verify sensitive profile is loaded.
   - Test fail-soft component states:
     - Total failure: `air.status === 'unavailable'` renders `ErrorCard` with retry button.
     - Stale data: `air.status === 'stale'` renders "Cached Xm ago" badge.
     - Station-only: missing model data renders Today verdict and hides ForecastChart + Tomorrow tab.
     - Weather-unavailable: hides WeatherStrip without breaking air cards.
   - Test chart debounced live announcements and keyboard boundaries (Home, End, ArrowLeft, ArrowRight).
2. **End-to-End / Accessibility Validation:**
   - Verify keyboard tab navigation across the entire page without focus traps.
   - Verify all interactive controls have accessible names (`aria-label`, `aria-describedby`).
   - Run Lighthouse accessibility audit on the built/preview application to guarantee score ≥ 90.

---

## Planning Recommendations & Phase Breakdown

Phase 4 can be executed cleanly across 2 targeted plans:
- **Plan 04-01: Profile Toggle & Fail-Soft States (ASM-03, UAX-01)**
  - Implement `breeze:profile` state management in `App.tsx` with synchronous `localStorage` hydration.
  - Add segmented Standard / Sensitive profile control in `VerdictHero.tsx` with explanatory caption.
  - Wire profile into `@breeze/core` calls (`verdictFor`, `reasonLines`, `tomorrowTab`, `buildTips`) ensuring zero network requests.
  - Implement comprehensive fail-soft states: `ErrorCard` on total air failure, "Cached Xm ago" stale badge in `ReadingBadge.tsx`, station-only and model-only graceful degradation, and clean weather unmounting.
  - Add unit and integration tests verifying zero-refetch behavior, persistence, and fail-soft paths.
- **Plan 04-02: Accessibility Hardening & WCAG AA Polish (UAX-02)**
  - Audit and upgrade color tokens in `tokens.css` and component classes for WCAG AA contrast (≥4.5:1).
  - Implement Non-Color Triad (Text + Number + Semantic Icon) across category and verdict displays.
  - Build live announcer region (`aria-live="polite"`) for verdict updates, profile switches, and debounced chart scrubbing.
  - Apply unified high-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2`) across all controls.
  - Add `prefers-reduced-motion` CSS rules.
  - Run accessibility verification tests and audit for Lighthouse accessibility ≥ 90.

