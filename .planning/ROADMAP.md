# Roadmap: Breeze

## Overview

Breeze ships inside one 48-hour hackathon weekend, so the roadmap mirrors PRD §18's time slots as five coarse phases: prove the decision engine and live API Friday night into Saturday morning (unit tests + live smoke runs, zero mock data), put the complete P0 experience in front of a user by Saturday midday, deploy to a public AWS URL Saturday afternoon as a hard mid-timeline gate (miss the Sat 6 PM cut rule and P1/P2 are dropped), harden Saturday evening (instant Sensitive toggle, honest fail-soft states, WCAG AA), then Sunday deliver sharing — deep link first, PNG card second — closing with the submission package as its own exit-checked gate. P2 (FR-18/19) and all prospects are v2 and intentionally map to no phase.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Core, API & Live Data** - Tested decision engine + live /api/assess with fail-soft orchestration (Fri eve – Sat morning)
- [x] **Phase 2: Web P0 — Search, Verdict & Forecast** - Complete P0 experience end-to-end locally (Sat midday)
- [ ] **Phase 3: Deploy to Public URL** - SAM + Amplify to a phone-verified public URL inside the Sat 6 PM cut rule (Sat afternoon)
- [ ] **Phase 4: Hardening — Toggle, Fail-Soft & A11y** - Instant Sensitive toggle, honest failure states, WCAG AA (Sat evening)
- [ ] **Phase 5: Sharing & Submission** - Deep link first, PNG card second, saved places, about sheet, then submit (Sun)

## Phase Details

### Phase 1: Core, API & Live Data

**Goal**: Ship the tested decision engine and live /api/assess so any Indian place yields an honest, per-section-degrading assessment — verified by unit tests and live smoke runs.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Window**: PRD §18 Fri evening + Sat morning
**Requirements**: ASM-04, DEC-01, DEC-02, DEC-03, DEC-04
**Success Criteria** (what must be TRUE):

  1. Every verdict-matrix cell and CPCB boundary (30/60/90/120/250) passes unit tests, so each category edge resolves to the correct verdict for Standard and Sensitive profiles.
  2. Best-window and tip rules pass tests: the window is hidden below 15% improvement, a Poor-or-worse window is never presented as an invitation, and tips are capped at 5 with each citing the value that triggered it.
  3. Day boundaries (Today/Tomorrow, 06:00–20:00 mean, 05:00–21:00 window) follow the Place's local timezone — identical results under TZ=UTC and TZ=Asia/Kolkata runs.
  4. A live smoke run returns real PM2.5, forecast and weather for ≥3 Indian places spanning metro and small town, and black-holing one upstream still returns per-section ok/stale/unavailable with the station-only and model-only degrade paths intact — never a fabricated number.

**Plans**: 6 plans
Plans:
**Wave 1**

- [x] 01-01: Workspace scaffold (pnpm, pinned manifests, Vitest harness, D-13 scripts, .env hygiene) + consolidated package-legitimacy gate before install

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02: @breeze/core foundation — types/config/wallclock/category/geo + boundary, wall-clock and geo tests

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03: @breeze/core decision layer — verdict matrix, reason lines, Tomorrow tab, effective-PM2.5 ladder, best window, rule-driven tips + matrix/ladder/window/tip/TZ-diff tests
- [x] 01-04: apps/api serving scaffold (Hono app/dev/lambda, health, TTL cache, SAM template + local sam build) + four zod-validated upstream clients (4 s AbortController timeouts)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-05: GET /api/assess — two-stage zod + India bbox → TTL cache → Promise.allSettled → normalise, with blackhole-upstream fail-soft tests + structured logs + AssessResponseSchema

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 01-06: Day-one live verification — smoke-live across 4 place types with self-spawned blackhole servers + browser walking-skeleton render + SKELETON.md sign-off

### Phase 2: Web P0 — Search, Verdict & Forecast

**Goal**: A user can pick any place in India and see the complete P0 assessment — reading with provenance, forecast chart, tips, weather strip, footer — end-to-end locally against live data.
**Mode:** mvp
**Depends on**: Phase 1
**Window**: PRD §18 Sat midday
**Requirements**: PLC-01, PLC-02, PLC-03, ASM-01, ASM-02, FCT-01, FCT-02, FCT-03
**Success Criteria** (what must be TRUE):

  1. User types ≥2 characters and picks from up to 8 India-only results with name + state, or taps Use-my-location and gets a friendly reverse-geocode label; denied/timeout shows a message and focuses search, and an out-of-India fix shows "Breeze covers India".
  2. Picking a place renders one /api/assess fetch behind skeletons; air and weather sections independently show ok / stale / unavailable, and the verdict card (Today/Tomorrow tabs, headline, top-2 reasons) renders from the computed result.
  3. Current PM2.5 renders in µg/m³ with category (colour + text + icon), a source badge naming the station (name, distance, age) or saying "model estimate (~45 km)", and a High/Medium/Low confidence chip.
  4. The 48-hour forecast chart with category bands, now marker, night shading and tooltip is readable at 360 px with keyboard-focusable points; the weather strip hides entirely when weather is unavailable; the footer shows "Updated hh:mm", per-source timestamps and CAMS/Open-Meteo + OpenAQ provider attribution.

**Plans**: 3 plans

Plans:

- [x] 02-01: URL-as-state router, place search + use-my-location + reverse label, TanStack Query wiring with explicit non-default config, skeletons + per-section states
- [x] 02-02: Verdict card surface with current reading (source badge + confidence chip), rule-driven tips, weather strip, provenance footer
- [x] 02-03: 48-h SVG forecast chart with bands, now marker, night shading, tooltip, keyboard-focusable points

### Phase 3: Deploy to Public URL

**Goal**: The app is live at a public AWS URL, verified on a real phone, inside the Sat 6 PM cut rule — deployment is a roadmap-level gate, not an afterthought.
**Mode:** mvp
**Depends on**: Phase 2
**Window**: PRD §18 Sat afternoon — HARD GATE: public URL by ~6 PM or P1/P2 are cut
**Requirements**: DEPL-01, DEPL-02
**Success Criteria** (what must be TRUE):

  1. The public Amplify URL opens on a real phone over mobile data and shows a live assessment for a chosen place, with the Lambda Function URL serving /api/assess and CloudWatch logging live upstream calls.
  2. A deep link loads in a signed-out private window (SPA rewrite serves assets, not HTML), and curl against the deployed API returns a single ACAO header — CORS lives only on the Function URL.
  3. The performance budget holds on the deployed URL: verdict <3 s warm on 4G, API p95 ≤2.5 s warm, initial JS <200 KB gzipped, Lighthouse mobile performance ≥90.
  4. The URL is live and phone-verified by Saturday 6 PM — the cut-rule gate that unlocks Phase 5 (otherwise P1/P2 are dropped and only P0 ships).

**Plans**: 1/2 plans executed

Plans:

- [x] 03-01-PLAN.md
- [ ] 03-02-PLAN.md

**Wave 1**

- [x] 03-01: SAM deploy of the API (--build-in-source, Function URL, NoEcho key, allow-list) with curl single-ACAO + OPTIONS verification from the deployed URL

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 03-02: Amplify connect + monorepo root + SPA rewrite + VITE_API_BASE_URL origin ordering, then phone test, signed-out deep-link check and perf-budget verification

### Phase 4: Hardening — Toggle, Fail-Soft & A11y

**Goal**: P0 definition of done on the deployed interface: an instant Sensitive toggle, honest failure states, and WCAG AA accessibility.
**Mode:** mvp
**Depends on**: Phase 3
**Window**: PRD §18 Sat evening
**Requirements**: ASM-03, UAX-01, UAX-02
**Success Criteria** (what must be TRUE):

  1. User flips Standard/Sensitive and the verdict and tips recompute instantly with zero network requests (asserted), and the choice persists locally across reload.
  2. Total failure shows "Can't assess right now" with Retry and no number lacking a source; stale results are labelled with their age; no mock data exists anywhere in the product.
  3. The verdict is announced via aria-live, colour is never the only signal, the full keyboard path covers every interactive control and chart point, reduced motion is respected, and Lighthouse accessibility is ≥90 on the deployed URL.

**Plans**: 2 plans

Plans:

- [ ] 04-01: Sensitive toggle with zero-refetch assertion + fail-soft states (total-failure Retry card, stale age labels, per-section unavailable rendering)
- [ ] 04-02: Accessibility pass — contrast-validated tokens, colour+icon+word verdict, aria-live, keyboard path incl. chart, reduced motion, Lighthouse a11y ≥90

### Phase 5: Sharing & Submission

**Goal**: Sunday ship — sharing that works from the running app (deep link first, PNG card second, saved places, about sheet) — then the submission package with its own exit check.
**Mode:** mvp
**Depends on**: Phase 4
**Window**: PRD §18 Sun morning (code freeze ~noon) + Sun midday/early afternoon submission
**Requirements**: SHR-01, SHR-02, SHR-03, SHR-04
**Success Criteria** (what must be TRUE):

  1. User taps copy-link and gets /?lat=..&lon=..&n=..; opening that link signed-out a day later shows the same place with live current data. (Deep link lands before the card work — the card prints this URL.)
  2. User shares a 1080×1350 PNG card (place, verdict, PM2.5, 2–3 tips, "As of" from measuredAt, source label, URL) via Web Share with download + copy-link fallback; share is disabled when no verdict exists; verified on a real iPhone.
  3. User saves up to 5 places as localStorage chips that survive reload, and can open the About/data-sources sheet explaining PM2.5 vs AQI vocabulary, model resolution and confidence.
  4. *(Process gate — no REQ-ID; research PITFALLS #10 / PRD §18)* Submission checklist executes hours before the deadline: public repo with organic commits, README with run steps + architecture, ≤3:00 video that plays signed-out, writeup with AI-tools list; submission confirmed.

**Plans**: 3 plans

Plans:

- [ ] 05-01: Deep-link polish + copy-link share path (elevated first), ≤5 saved-place chips, About/data-sources sheet
- [ ] 05-02: 1080×1350 PNG share card — fonts.ready + double-capture loop, iOS Safari QA on a real iPhone, download/copy-link fallback
- [ ] 05-03: Submission package — README, video record/upload, writeup, final smoke run, submit with a re-record slot held

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 (Sat 6 PM gate) → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core, API & Live Data | 6/6 | Completed | 2026-10-11 |
| 2. Web P0 — Search, Verdict & Forecast | 3/3 | Completed | 2026-10-11 |
| 3. Deploy to Public URL | 2/2 | Completed | 2026-10-11 |
| 4. Hardening — Toggle, Fail-Soft & A11y | 0/2 | Not started | - |
| 5. Sharing & Submission | 0/3 | Not started | - |

**Notes:**

- Phase 3 is the roadmap-level cut-rule gate: no public URL by Sat 6 PM ⇒ drop Phase 5's P1 scope (and all P2) per PRD §5.
- P2 (FR-18 FIRMS panel, FR-19 OG preview) and prospects PRSP-01..07 are v2 — intentionally mapped to no phase.
