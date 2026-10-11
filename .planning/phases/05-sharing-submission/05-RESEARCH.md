# Phase 5: Sharing & Submission — Research Report

**Researched:** 2026-10-11  
**Domain:** Client-Side Image Generation / Web Share API / Local Persistence / Accessible Dialog / Hackathon Submission  
**Confidence:** HIGH  

---

## Executive Summary

Phase 5 delivers the Sunday ship requirements for Breeze:
1. **Canonical Deep Links (SHR-01 / D-14):** One-tap copy of `/?lat=..&lon=..&n=..` that loads live air assessment on any device with instant floating toast feedback.
2. **1080×1350 PNG Share Card (SHR-02 / D-01..D-05):** Rendered client-side via `html-to-image@1.11.13` from a fixed off-screen DOM node, utilizing a double-capture loop with `document.fonts.ready` check and 150 ms RAF delay to eliminate WebKit/iOS Safari blank-canvas bugs. Invokes native Web Share (`navigator.canShare({ files })`) with automatic download + clipboard link fallback. Disabled when `air.status === 'unavailable'`.
3. **Saved Places Chips (SHR-03 / D-06..D-09):** Horizontal chip bar beneath the search bar persisting up to 5 locations in `localStorage` under `breeze:saved-places`. Highlights current place within ~0.02° (~2.2 km), provides discrete (X) removal, and enforces a 5-place ceiling with a polite toast.
4. **Accessible About & Data Sources Modal (SHR-04 / D-10..D-12):** Focus-trapped Dialog modal accessible from top navigation header and provenance footer, detailing plain-language verdicts, PM2.5 vs AQI, station monitors vs 45 km CAMS models, confidence tiers, and attribution.
5. **Submission Package (D-16):** Production README, ≤3:00 demo video storyboard checklist, and hackathon writeup outline with mandatory AI coding disclosures.

---

## 1. `html-to-image` v1.11.13 Integration (Vite + React 19 + Tailwind v4)

### Package & Dependency
- Package: `html-to-image@1.11.13` (install via `pnpm --filter @breeze/web add html-to-image@1.11.13`).
- Bundle impact: ~11 KB gzipped, pure client-side TypeScript, zero native dependencies, perfectly fits the <200 KB gzipped budget.

### DOM Node Mount & Offscreen Positioning (D-01)
`html-to-image` functions (`toPng`, `toBlob`) work by cloning the DOM node and inlining styles into an SVG `<foreignObject>`.
- **CRITICAL GOTCHA:** If the capture node or any ancestor has `display: none` or `visibility: hidden`, `getBoundingClientRect()` returns 0×0 and `html-to-image` throws or produces an empty transparent image.
- **Off-screen Mounting Pattern:**
  Mount the element inside a fixed off-screen container outside the visible viewport:
  ```tsx
  <div
    style={{
      position: "fixed",
      left: "-9999px",
      top: 0,
      width: "1080px",
      height: "1350px",
      overflow: "hidden",
      pointerEvents: "none",
      zIndex: -100,
    }}
    aria-hidden="true"
  >
    <ShareCard ref={shareCardRef} data={data} profile={profile} />
  </div>
  ```
- **Dimensions & Scaling:**
  Style the root card element with fixed dimensions: `width: 1080px; height: 1350px; box-sizing: border-box;`.
  When invoking `toBlob`:
  ```ts
  const blob = await toBlob(node, {
    width: 1080,
    height: 1350,
    canvasWidth: 1080,
    canvasHeight: 1350,
    pixelRatio: 1, // Native 1:1 pixel rendering at 1080x1350 px
  });
  ```
  This guarantees a crisp 1080×1350 image (4:5 vertical portrait aspect ratio matching Instagram Stories, WhatsApp status, and messaging cards) regardless of whether the user is on a 390px iPhone or zoomed desktop browser.

### Font Loading & The WebKit / iOS Safari Quirk (D-03)
In WebKit (Safari on iOS & macOS), SVG `<foreignObject>` canvas rasterization has a known race condition:
1. Stylesheets and `@font-face` definitions are parsed asynchronously when the cloned SVG data URL is loaded into an `HTMLImageElement`.
2. On the first pass, WebKit often paints before glyphs or embedded SVGs are decoded, resulting in blank text or missing icons.
3. **Double-Capture Lifecycle & Font Guard:**
   ```ts
   // Step 1: Font readiness guard
   if (document.fonts?.ready) {
     await document.fonts.ready;
   }

   // Step 2: First pass (warms WebKit foreignObject font rasterizer; discard result)
   await toPng(node, { cacheBust: true });

   // Step 3: Frame settling delay (150ms RAF)
   await new Promise<void>((resolve) => {
     requestAnimationFrame(() => {
       setTimeout(resolve, 150);
     });
   });

   // Step 4: True capture pass
   const blob = await toBlob(node, {
     width: 1080,
     height: 1350,
     canvasWidth: 1080,
     canvasHeight: 1350,
     pixelRatio: 1,
   });
   ```
4. **Font Family Selection:**
   `tokens.css` already defines `--font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;`.
   System fonts require zero external network font fetching and zero CORS headers.

---

## 2. Web Share API File Sharing & Fallback Flow (SHR-02 / D-04)

### File Object Construction
Create a standard `File` from the captured Blob:
```ts
const slug = placeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const filename = `breeze-${slug || "air"}.png`;
const file = new File([blob], filename, {
  type: "image/png",
  lastModified: Date.now(),
});
```

### Permission & Capability Matrix
- **Android Chrome:** Supports sharing `{ files: [file], title, text, url }`.
- **iOS Safari (14.3+):** Supports `{ files: [file] }`. Note: WebKit drops the URL parameter on some versions if both `files` and `url` are passed simultaneously; combining the URL into the `text` string ensures the link is always shared:
  ```ts
  const shareData = {
    files: [file],
    title: `Air in ${placeName} — Breeze`,
    text: `Air in ${placeName} is "${verdict}" (${pm25} µg/m³ PM2.5). Check live verdict: ${canonicalUrl}`,
  };
  ```
- **Desktop Browsers (Firefox / Linux / unsupported Chrome):** `navigator.canShare?.({ files: [file] })` evaluates to `false`.

### User Abort vs Failure Handling
When a user opens the mobile share sheet and dismisses it by tapping "Cancel", `navigator.share()` rejects with `AbortError` (`error.name === "AbortError"`).
This must **NOT** trigger an error toast or fallback download:
```ts
if (navigator.canShare && navigator.canShare({ files: [file] })) {
  try {
    await navigator.share(shareData);
  } catch (err: any) {
    if (err.name === "AbortError") {
      return; // Normal user cancellation
    }
    // Non-abort failure (e.g. permission denied) -> fallback
    triggerDownloadAndCopy(blob, canonicalUrl, filename);
  }
} else {
  // Unsupported device -> fallback
  triggerDownloadAndCopy(blob, canonicalUrl, filename);
}
```

### Fallback Implementation:
```ts
function triggerDownloadAndCopy(blob: Blob, url: string, filename: string) {
  // 1. Trigger direct browser download
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);

  // 2. Copy deep link to clipboard
  navigator.clipboard.writeText(url)
    .then(() => {
      showToast("Card downloaded & link copied to clipboard!");
    })
    .catch(() => {
      showToast("Card downloaded!");
    });
}
```

---

## 3. Accessible Dialog Pattern (SHR-04 / D-10..D-12)

### Controlled Overlay Dialog vs Native `<dialog>`
- **Recommendation:** Use a custom controlled overlay dialog (`role="dialog"` + `aria-modal="true"`).
- **Rationale:** Native `<dialog>.showModal()` is not implemented in synthetic testing environments (Happy-DOM / Vitest) and requires mocking. A controlled overlay provides:
  1. 100% deterministic React state management (`isOpen: boolean`).
  2. Focus trapping on open and restore on close (`triggerRef.current?.focus()`).
  3. Keyboard `Escape` listener.
  4. Backdrop click dismissal.
  5. Body scroll lock (`document.body.style.overflow = 'hidden'`).
  6. Smooth backdrop blur (`backdrop-blur-sm bg-slate-900/60`).

### Dialog Semantics & A11y Structure
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="about-dialog-title"
  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
  onClick={handleBackdropClick}
>
  <div
    ref={dialogRef}
    tabIndex={-1}
    className="w-full max-w-lg max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
  >
    {/* Header */}
    <div className="flex items-center justify-between p-6 border-b border-slate-100">
      <h2 id="about-dialog-title" className="text-lg font-bold text-slate-900">
        About Breeze & Data Sources
      </h2>
      <button
        onClick={onClose}
        aria-label="Close dialog"
        className="p-2 text-slate-400 hover:text-slate-600 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <X className="w-5 h-5" />
      </button>
    </div>

    {/* Scrollable Body: 4 Sections */}
    <div className="overflow-y-auto p-6 space-y-6 text-sm text-slate-600">
      {/* 1. Plain Verdicts & PM2.5 */}
      {/* 2. Stations vs 45 km Model */}
      {/* 3. Confidence Ratings */}
      {/* 4. Data Providers & Licences */}
    </div>
  </div>
</div>
```

---

## 4. LocalStorage Saved Places & URL State (SHR-03 / D-06..D-09)

### Storage Contract & Types
- **Key:** `breeze:saved-places`
- **Schema:**
  ```ts
  export interface SavedPlace {
    lat: number;
    lon: number;
    name: string;
  }
  ```
- **Ceiling:** Max 5 places.
- **Fail-soft:** All storage accesses wrapped in `try / catch` to handle Private Browsing mode and storage quotas gracefully.

### Hook: `useSavedPlaces`
```ts
export function useSavedPlaces(current: { lat: number; lon: number; name: string }) {
  const [places, setPlaces] = useState<SavedPlace[]>(() => {
    try {
      const raw = localStorage.getItem("breeze:saved-places");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 5);
      }
      return [];
    } catch {
      return [];
    }
  });

  const isCurrentSaved = places.some(
    (p) => Math.abs(p.lat - current.lat) < 0.02 && Math.abs(p.lon - current.lon) < 0.02
  );

  const toggleSaveCurrent = (): { action: "saved" | "removed" | "limit_reached" } => {
    if (isCurrentSaved) {
      const filtered = places.filter(
        (p) => !(Math.abs(p.lat - current.lat) < 0.02 && Math.abs(p.lon - current.lon) < 0.02)
      );
      persist(filtered);
      return { action: "removed" };
    }

    if (places.length >= 5) {
      return { action: "limit_reached" };
    }

    const next = [...places, { lat: current.lat, lon: current.lon, name: current.name }];
    persist(next);
    return { action: "saved" };
  };

  const removePlace = (place: SavedPlace) => {
    const next = places.filter((p) => !(p.lat === place.lat && p.lon === place.lon));
    persist(next);
  };

  return { places, isCurrentSaved, toggleSaveCurrent, removePlace };
}
```

---

## 5. Canonical Deep Links (SHR-01 / D-14) & Toast System (D-15)

### Canonical Link Generation
- URL format: `${window.location.origin}/?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}&n=${encodeURIComponent(name)}`
- Consistent parameter keys: `n` is preferred as short query key; `useLocationParams.ts` already parses both `n` and `name`.

### Toast Notification System
- Lightweight `Toast` component:
  ```tsx
  <div
    role="status"
    aria-live="polite"
    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-full shadow-lg flex items-center gap-2"
  >
    <Check className="w-4 h-4 text-emerald-400" />
    <span>{message}</span>
  </div>
  ```
- Auto-dismiss after 2500 ms with timeout cancellation on re-trigger.

---

## 6. Submission Package Deliverables Checklist (D-16 / PRD §18)

### 1. `README.md`
- Core Proposition & Problem Statement.
- Architecture diagram (Web on Amplify, API on Lambda arm64 Function URL, shared `@breeze/core`).
- Data Honesty contract (100% live upstream calls, zero mock data, fail-soft transparency, station vs 45km model).
- Local dev & deploy instructions (`pnpm dev`, `sam build`, `sam deploy`).
- Live production URLs.

### 2. Video Walkthrough Checklist (≤3:00 max, YouTube Unlisted)
- [ ] Strictly ≤ 3:00 duration.
- [ ] Audible clear voiceover.
- [ ] Plays signed-out on YouTube.
- [ ] Storyboard:
  1. The Problem (abstract AQI vs actionable plain verdict)
  2. Live Walkthrough (search, geolocation, verdict, reasons, cleanest window, instant Sensitive toggle)
  3. Data Honesty (station vs 45km model, "As of" timestamps, confidence chips, About modal)
  4. Sharing (deep link copy, 1080x1350 PNG card, saved places bar)
  5. AWS Architecture & Lambda Function URL logs.

### 3. Submission Writeup Outline with AI Disclosures
- Problem & Resident context.
- Architecture rationale (Function URL + Amplify Hosting + IAM least-privilege).
- Data honesty commitment (never fabricate numbers).
- Full AI disclosure: built with Claude Code / Gemini CLI within 48h hackathon, production runtime is 100% deterministic TypeScript without LLM runtime latency.

## RESEARCH COMPLETE
