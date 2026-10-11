# Phase 5: Sharing & Submission - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-11
**Phase:** 5-Sharing & Submission
**Areas discussed:** PNG Share Card Design & Capture, Saved Places Bar, About / Data Sources Modal, Copy Deep Link UX & Toast Notification

---

## PNG Share Card Design & Capture

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone hidden off-screen DOM node | Fixed 1080x1350 px styling that renders only for capture | ✓ |
| Visible preview modal | Scaled-down card preview in dialog before sharing | |
| Direct native share | Immediate share / download without modal | |

**User's choice:** Standalone hidden off-screen DOM node with fixed 1080x1350 px styling that renders only for capture.
**Notes:** Avoids modal layout jank, especially on mobile browsers.

---

## PNG Share Card Layout Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Hero focus | Big verdict badge, large PM2.5 + category color, top 2-3 tips, provenance footer | ✓ |
| Full infographic | Hero verdict + mini forecast sparkline + weather strip + tips + QR code | |
| Minimalist statement | Place, giant verdict phrase, PM2.5 number, source label, app branding | |

**User's choice:** Hero focus: Big verdict badge, large PM2.5 + category color, top 2-3 tips, provenance footer ("As of hh:mm", station/model label, breeze app URL).

---

## Capture Lifecycle & Font Stability

| Option | Description | Selected |
|--------|-------------|----------|
| Double-capture loop | document.fonts.ready check and 150ms RAF delay to avoid iOS blank canvas quirks | ✓ |
| Single-shot htmlToImage | Standard fonts.ready await | |
| You decide | Robust fail-soft implementation | |

**User's choice:** Double-capture loop with document.fonts.ready check and 150ms RAF delay to avoid iOS blank canvas quirks.

---

## Native Web Share & Fallback Cascade

| Option | Description | Selected |
|--------|-------------|----------|
| Web Share + Download/Copy fallback | If navigator.canShare({ files }), share PNG; else trigger file download + copy link with toast | ✓ |
| Only file download | Uniform download on desktop and mobile | |
| Copy image to clipboard | navigator.clipboard.write([ClipboardItem]) with download fallback | |

**User's choice:** If navigator.canShare({ files: [file] }) is true, share PNG file; else trigger automatic browser file download + copy link to clipboard with toast.

---

## Saved Places Bar UI Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal chip bar | Beneath Search/Location bar with bookmark toggle in search bar | ✓ |
| Inside search dropdown | Saved Places pinned section inside autocomplete dropdown | |
| Floating bottom drawer | Bottom sheet / quick-access bar | |

**User's choice:** Horizontal scrollable chip bar right beneath the Search/Location bar with a "Save place" / "Bookmark" toggle button in the search bar.

---

## Saved Places 5-Place Limit Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Informative toast | "Maximum 5 places saved. Remove one to save another." without saving | ✓ |
| FIFO auto-eviction | Automatically drop oldest saved place | |
| Modal replacement picker | Prompt user to choose which place to replace | |

**User's choice:** Informative toast message explaining "Maximum 5 places saved. Remove one to save another." without saving.

---

## Saved Place Deletion

| Option | Description | Selected |
|--------|-------------|----------|
| Discrete (X) icon | Small close icon on chip with aria-label + unbookmark in search | ✓ |
| Long-press context menu | Mobile long-press menu | |
| Manage edit mode | Toggle edit mode with delete badges | |

**User's choice:** Small discrete (X) close icon on each chip with aria-label="Remove [PlaceName]" + unbookmark star in search bar for current place.

---

## Saved Place Active State

| Option | Description | Selected |
|--------|-------------|----------|
| Active border & tint | Active border (blue-600) and tinted background (blue-50) within ~0.02 deg | ✓ |
| No active state | Clicking simply navigates | |
| Bold font & checkmark | Text styling change | |

**User's choice:** Highlight chip with active border and tinted background (e.g., blue-50 + blue-600 border) matching current lat/lon within 0.02 deg (~2 km).

---

## About / Data Sources Modal Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Accessible Dialog modal | Backdrop blur, ESC key close, focus trap, scrollable content | ✓ |
| Bottom drawer | Bottom sheet on mobile, modal on desktop | |
| Inline accordion | Collapsible inside ProvenanceFooter | |

**User's choice:** Accessible overlay Dialog modal with backdrop blur, keyboard ESC to close, focus trap, and clean scrollable content.

---

## About Modal Triggers

| Option | Description | Selected |
|--------|-------------|----------|
| Header button + Footer link | Discreet button in header top-right AND link in ProvenanceFooter | ✓ |
| Header only | Info icon in header | |
| Footer only | Link at the bottom of the page | |

**User's choice:** Discreet "About & Data Sources" button in header (top right) AND a clickable link in ProvenanceFooter ("Learn how Breeze measures air quality").

---

## About Modal Content Structure

| Option | Description | Selected |
|--------|-------------|----------|
| 4 focused sections | Verdicts/PM2.5 vs AQI, Stations vs 45km Model, Confidence Ratings, Attributions | ✓ |
| Narrative essay | Long-form story about air quality | |
| Collapsible FAQ | FAQ questions and answers | |

**User's choice:** 4 focused sections: 1. Plain Verdicts & PM2.5 (vs AQI), 2. Stations vs 45km Model, 3. Confidence Ratings, 4. Data Sources & Attribution (CAMS, OpenAQ, Open-Meteo).

---

## Copy Link Button Placement

| Option | Description | Selected |
|--------|-------------|----------|
| VerdictHero button group | Direct on VerdictHero with "Copy Link" and "Share Card" | ✓ |
| Single Share action sheet | Opens dropdown with both options | |
| Header action button | Next to About button in header | |

**User's choice:** Prominent "Share" button group directly on VerdictHero with two buttons: "Copy Link" and "Share Card" (image icon).

---

## Deep Link Query Parameters Format

| Option | Description | Selected |
|--------|-------------|----------|
| Canonical origin + params | window.location.origin + /?lat=${lat}&lon=${lon}&n=${name} (coords to 2 dp) | ✓ |
| Full window.location.href | Raw string from browser | |
| Include profile | Add &p=sensitive | |

**User's choice:** Canonical window.location.origin + /?lat=${lat}&lon=${lon}&n=${encodeURIComponent(name)} with coordinates rounded to 2 decimal places.

---

## Copy Link Feedback & Toast

| Option | Description | Selected |
|--------|-------------|----------|
| Floating bottom toast | Lightweight toast ("Link copied to clipboard!") auto-dismissing after 2.5s with aria-live | ✓ |
| Inline button state | Swaps button text to "Copied!" for 2s | |
| Both | Toast AND button state swap | |

**User's choice:** Lightweight non-blocking floating bottom toast ("Link copied to clipboard!") with checkmark icon, auto-dismissing after 2.5s and polite aria-live announcement.

---

## the agent's Discretion

- Gradient and palette specifics for the off-screen 1080×1350 capture template.
- Lucide React icon selection for bookmark, share, copy, and close actions.
- Animation curves and timings for floating toast entrance/exit.

## Deferred Ideas

- None. (Dynamic server OG previews and NASA FIRMS fire map remain deferred to v2).

