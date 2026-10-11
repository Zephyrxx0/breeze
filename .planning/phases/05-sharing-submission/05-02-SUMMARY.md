# Plan 05-02 Summary: 1080x1350 PNG Share Card & Web Share Integration

**Phase:** 05-sharing-submission  
**Plan:** 02  
**Requirement:** SHR-02  
**Status:** Completed  

---

## 1. Overview of Changes

Implemented client-side 1080×1350 PNG share card generation using `html-to-image` and standard Web Share API with resilient fallbacks.

1. **ShareCard Template (`apps/web/src/components/ShareCard.tsx`):**
   - Fixed 1080×1350 px layout (4:5 story aspect ratio) rendered off-screen (`left: -9999px`).
   - Clean visual hierarchy:
     - Branding bar: Breeze logo + "Live Air Verdict" + sensitivity profile chip.
     - Location header: place name in bold typography.
     - Plain-language verdict hero box: "Good to go" / "Take care" / "Stay indoors if you can" with semantic icons, category pill, and 2-line reasoning.
     - PM2.5 metric block: giant concentration value in µg/m³, confidence chip, source classification (Station vs Regional model ~45km), and measurement timestamp.
     - Actionable tips block: top 2-3 rule-driven advice items with check icons.
     - Provenance footer: attribution to Open-Meteo, OpenAQ, CAMS + `breeze-air.in`.

2. **Double-Pass Capture Pipeline (`apps/web/src/lib/shareCardCapture.ts`):**
   - Font readiness guard: awaits `document.fonts.ready` when available.
   - Initial warm-up pass: runs `toPng` and discards output to prime WebKit/iOS Safari SVG foreignObject rasterizers.
   - Settling frame delay: 150 ms RAF delay.
   - True capture pass: runs `toBlob` with explicit 1080×1350 canvas bounds.
   - File packaging: creates `new File([blob], filename, { type: 'image/png' })`.
   - Native Web Share API: uses `navigator.canShare({ files: [file] })` and `navigator.share(...)`. Catches `AbortError` quietly when user dismisses the share sheet.
   - Fallback: automatically triggers direct `.png` download, copies canonical URL to clipboard, and raises toast notification: *"Card downloaded & link copied to clipboard!"*.

3. **VerdictHero & App Integration:**
   - Disabled state with explanatory tooltip on "Share Card" when air quality is `unavailable`.
   - Dynamic button label ("Generating...") during capture execution.
   - Mounted off-screen container in `App.tsx` with `aria-hidden="true"`, zero layout shifting.

4. **Testing & Verification:**
   - Added unit test suite in `apps/web/src/test/share-card.test.tsx` (7 tests covering template rendering, button state, Web Share invocation, download fallback, and AbortError handling).
   - Monorepo test suite passes: 17 test files, 96 tests green.
   - Production bundle budget verified: 127.53 kB gzipped JS (<200 kB budget target).

