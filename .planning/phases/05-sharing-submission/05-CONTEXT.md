# Phase 5: Sharing & Submission - Context

**Gathered:** 2026-10-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 delivers shareability, local persistence, and the complete hackathon submission package:
- Deep link copying (`/?lat=..&lon=..&n=..`) with canonical URL normalization and non-blocking toast feedback.
- Client-side 1080×1350 PNG share card rendered via `html-to-image` using a double-capture loop, font readiness check, and Web Share API with download + clipboard fallback.
- Saved places bar persisting up to 5 location chips in `localStorage` with active place indicator, deletion, and limit enforcement.
- Accessible About / Data Sources Dialog modal explaining plain-language verdicts, PM2.5 vs AQI, physical station readings vs 45 km CAMS regional model, and data provenance/attributions.
- Complete hackathon submission package (README with architecture/run steps, ≤3:00 video walkthrough, writeup with AI disclosures).

**Explicitly Out of Scope:**
- Server-side image generation / Puppeteer backend (client-side `html-to-image` only).
- Dynamic server-rendered Open Graph image generation (v2 / FR-19).
- User accounts, cloud databases, sync across devices (remains strictly client-side via URL and `localStorage`).
- NASA FIRMS fire heuristic (v2 / FR-18).

</domain>

<decisions>
## Implementation Decisions

### PNG Share Card Design & Capture
- **D-01:** **Off-screen Capture Node** — Render the 1080×1350 px share card inside a hidden off-screen container mounted only during active capture, preventing layout jank or mobile viewport clipping.
- **D-02:** **Hero Focus Layout** — Card features a high-impact layout: Place Name, large Verdict badge & category background hue, bold PM2.5 value (µg/m³), top 2–3 actionable tips, and a clean provenance footer ("As of [time]", station/model label, Breeze web URL).
- **D-03:** **Double-Capture Lifecycle & Font Guard** — Execute a double-render capture pass with `document.fonts.ready` check and a 150 ms `requestAnimationFrame` delay to eliminate blank canvas / missing font rendering quirks on WebKit/iOS Safari.
- **D-04:** **Web Share & Fail-Soft Fallback** — Check `navigator.canShare({ files: [file] })`: if supported, invoke native share sheet; otherwise automatically trigger direct image file download and copy the deep link to the clipboard with an accompanying toast.
- **D-05:** **Share Gate** — The share actions ("Share Card" and "Copy Link") remain disabled when no valid air assessment verdict exists (`air.status === 'unavailable'`).

### Saved Places Bar
- **D-06:** **Chip Bar UI Placement** — Mounted directly beneath the Search/Location bar as a horizontal scrollable row of saved place chips. A bookmark icon button inside or adjacent to the search input toggles saving the active location.
- **D-07:** **5-Place Limit Enforcement** — Enforce a strict ceiling of 5 saved places. Attempting to save a 6th surfaces a polite non-blocking toast: *"Maximum 5 places saved. Remove one to save another."* (no auto-eviction).
- **D-08:** **Discrete Removal Action** — Each chip includes a small (X) remove button with `aria-label="Remove [PlaceName]"` plus an unbookmark toggle button in the search bar for the currently active location.
- **D-09:** **Active Place Highlighting** — A chip matching the current coordinates (within ~0.02° / ~2 km) is highlighted with an active border (`border-blue-600`) and soft background tint (`bg-blue-50`).

### About / Data Sources Modal
- **D-10:** **Accessible Dialog Modal** — Built as an accessible overlay Dialog with backdrop blur, focus trap, keyboard `Escape` dismissal, scrollable body, and `aria-labelledby`/`aria-describedby` semantics.
- **D-11:** **Dual Entry Points** — Accessible via an "About & Sources" button in the top navigation header and via a secondary link in the ProvenanceFooter (*"Learn how Breeze measures air quality"*).
- **D-12:** **Four-Section Structure** — Structured cleanly into 4 educational sections:
  1. *Plain Verdicts & PM2.5*: Why Breeze focuses on PM2.5 rather than complex composite AQI.
  2. *Stations vs. 45 km Model*: How physical CPCB/OpenAQ monitors differ from CAMS Global atmospheric models.
  3. *Confidence Ratings*: High (nearby station) vs Medium (distant station) vs Low (pure regional model).
  4. *Data Providers & Attribution*: OpenAQ, Copernicus CAMS, Open-Meteo, BigDataCloud.

### Copy Deep Link UX & Toast Notification
- **D-13:** **VerdictHero Action Group** — Prominent button group placed directly on the `VerdictHero` card providing "Copy Link" and "Share Card" actions side-by-side with semantic icons.
- **D-14:** **Canonical URL Construction** — Normalizes links using `window.location.origin` with `lat`, `lon` (rounded to 2 decimal places), and `n` (URI-encoded friendly place name), omitting transient session params.
- **D-15:** **Floating Toast Notification** — On copy, display a lightweight floating bottom toast (*"Link copied to clipboard!"*) with a checkmark icon, auto-dismissing after 2.5 seconds, accompanied by a polite `aria-live` announcement.

### Hackathon Submission Package
- **D-16:** **Submission Gate** — Deliver production-ready `README.md` (clean run instructions, architectural overview, data honesty principles), an unlisted video walkthrough (≤3:00, audible audio, showing mobile responsive flow & fail-soft handling), and writeup detailing AI tools utilized.

### the agent's Discretion
- Visual styling details for the off-screen card gradient and borders.
- Specific micro-transitions for toast entrance and exit.
- Icon selection from Lucide React for bookmark, share, copy, and close actions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Specifications & Requirements
- `PRD.md` §14 — Sharing (deep links, 1080×1350 PNG card, Web Share API, fallbacks).
- `PRD.md` §15 — Saved places & About data sources sheet.
- `PRD.md` §18 — Submission checklist & cut rules.
- `.planning/REQUIREMENTS.md` — SHR-01, SHR-02, SHR-03, SHR-04.
- `research/STACK.md` — `html-to-image` usage details, font-readiness rules, iOS Safari double-capture workarounds.

### Existing Web & Core Code
- `apps/web/src/App.tsx` — Main application shell, header, location state, error boundaries.
- `apps/web/src/components/VerdictHero.tsx` — Target for Share / Copy Link button group.
- `apps/web/src/components/SearchBox.tsx` — Search input and bookmark button integration point.
- `apps/web/src/components/ProvenanceFooter.tsx` — Attribution footer and About modal trigger link.
- `apps/web/src/hooks/useLocationParams.ts` — URL parameter parsing and coordinate rounding logic.
- `packages/core/src/index.ts` — Core decision logic, categories, confidence calculations.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useLocationParams`: Already handles `lat`, `lon`, `name` query string synchronization and rounding to 2 decimal places.
- `VerdictHero`: Central card with high visual hierarchy, ideal anchor for "Copy Link" and "Share Card" actions.
- `tokens.css`: WCAG AA contrast-compliant tokens and high-contrast focus rings already defined.
- `ProvenanceFooter`: Contains timestamp and data source details ready to link into the About modal.

### Established Patterns
- Client-side persistence using `localStorage` with fail-soft try/catch blocks (`breeze:profile`).
- Screen reader announcements via global `<div aria-live="polite">` announcer in `App.tsx`.
- Fail-soft status checks inspecting `air.status === 'ok' | 'stale' | 'unavailable'`.

### Integration Points
- `apps/web/src/components/ShareCard.tsx` (new): 1080×1350 off-screen node and capture utility using `html-to-image`.
- `apps/web/src/components/SavedPlacesBar.tsx` (new): Horizontal chip bar beneath search bar with localStorage sync.
- `apps/web/src/components/AboutModal.tsx` (new): Accessible dialog explaining data sources, model vs station, PM2.5 vs AQI.
- `apps/web/src/components/Toast.tsx` (new): Floating bottom toast notification for copy and saved place feedback.

</code_context>

<specifics>
## Specific Ideas

- **Share Card Visuals:** Clean dark or category-tinted card with large verdict text, clean metrics grid, and prominent Breeze branding with footer attribution.
- **Saved Places Chips:** Compact pills with smooth horizontal overflow scroll, active border indication, and easy tap target for deletion.
- **Copy Link:** Quick copy action with clipboard write and instant toast confirmation.

</specifics>

<deferred>
## Deferred Ideas

- None — all discussed features are scoped within Phase 5. Server-rendered OG previews and NASA FIRMS fire overlays remain mapped to v2.

</deferred>

---

*Phase: 5-Sharing & Submission*
*Context gathered: 2026-10-11*
