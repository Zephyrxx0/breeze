# Requirements: Breeze

**Defined:** 2026-10-11
**Core Value:** One honest, actionable verdict per place — visible within 3 seconds, always naming its data source and confidence.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases. PRD FR IDs preserved for traceability.

### Place Input

- [ ] **PLC-01**: User can search for a place with India-only type-ahead (≥2 chars, 250 ms debounce, max 8 results with name + state) — FR-01
- [ ] **PLC-02**: User can tap "Use my location" and get their current assessment; denied/timeout shows a message and focuses search; outside India shows "Breeze covers India" — FR-02
- [ ] **PLC-03**: User sees a friendly name for GPS locations via reverse geocoding, falling back to "Your location" without blocking data loading — FR-03

### Live Assessment

- [ ] **ASM-01**: User sees a single /api/assess fetch render with skeletons, and each section (air, weather) independently shows ok / stale / unavailable — FR-04
- [ ] **ASM-02**: User sees current PM2.5 in µg/m³ with a category (colour + text + icon), a source badge naming the station (name, distance, age) or saying "model estimate (~45 km)", and a confidence chip (High/Medium/Low) — FR-05
- [ ] **ASM-03**: User never sees fabricated data; a total failure shows retry with no number lacking a source; a stale result (cache ≤3 h) is labelled with its age — FR-13
- [ ] **ASM-04**: User gets a partial assessment when one upstream fails: station-only hides chart/window/Tomorrow; model-only degrades to the model-estimate path — grilling Q5

### Decision Core

- [ ] **DEC-01**: User sees a verdict (Good to go / Take care / Stay indoors if you can) with Today and Tomorrow tabs, headline and top-2 reasons, matching the §7.2 matrix at every category boundary (unit-tested) — FR-06
- [ ] **DEC-02**: User sees the cleanest 3-hour daytime block in the next 24 h with its mean and % improvement, hidden when improvement <15%; the block is presented as fact and never as an invitation when its own mean is Poor (≥91) — FR-08 + grilling Q6
- [ ] **DEC-03**: User sees up to 5 priority-ordered tips, each citing the value that triggered it (mask, exercise, window, sunscreen, hydration, indoor air, umbrella) — FR-10
- [ ] **DEC-04**: User's verdict and tips use the Place's local timezone for all day boundaries (Today/Tomorrow, 06:00–20:00 mean, 05:00–21:00 window restriction) — grilling Q3

### Forecast & Context

- [ ] **FCT-01**: User sees a 48-hour PM2.5 chart with category bands, now marker, night shading and tooltip, readable at 360 px with keyboard-focusable points — FR-07
- [ ] **FCT-02**: User sees a weather strip (feels-like, humidity, UV now + today's max, rain chance) that hides entirely when weather is unavailable — FR-11
- [ ] **FCT-03**: User sees provenance: "Updated hh:mm", per-source timestamps and an attribution footer crediting CAMS/Open-Meteo, OpenAQ providers (and NASA FIRMS if P2 ships) — FR-12

### UX & Access

- [ ] **UAX-01**: User can switch Standard/Sensitive and see verdict and tips recompute instantly with no refetch; the choice persists locally — FR-09
- [ ] **UAX-02**: User experiences WCAG AA contrast, colour never as the only signal, an aria-live verdict, full keyboard operability and reduced-motion support; Lighthouse accessibility ≥90 — FR-14

### Sharing

- [ ] **SHR-01**: User can copy a deep link (/?lat=..&lon=..&n=..) that opens that place with live data — a link opened a day later shows current data — FR-16 (elevated: distribution floor for WhatsApp sharing)
- [ ] **SHR-02**: User can share a 1080×1350 PNG card (place, verdict, PM2.5, 2–3 tips, "As of" from measuredAt, source label, URL) via Web Share with download + copy-link fallback; share is disabled when no verdict exists — FR-15 + grilling Q9
- [ ] **SHR-03**: User can save up to 5 places as localStorage chips ({lat, lon, label}) that survive reload — FR-17
- [ ] **SHR-04**: User can open an About/data-sources sheet explaining PM2.5 vs AQI vocabulary, model resolution and confidence — P1 (PRD §5)

### Deployment

- [x] **DEPL-01**: The app is live at a public AWS URL (Amplify Hosting SPA + Lambda Function URL via SAM) and works on a real phone over mobile data — G4, PRD §13
- [x] **DEPL-02**: Performance budget holds: verdict <3 s warm on 4G, API p95 ≤2.5 s warm, initial JS <200 KB gzipped, Lighthouse mobile ≥90 — PRD §16

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Stretch (PRD P2)

- **FR-18**: Upwind VIIRS fire-detection heuristic within 300 km, labelled as an indication, never "stubble burning"
- **FR-19**: Server-rendered Open Graph image so WhatsApp unfurls the live verdict

### Prospects (PRD §20)

- **PRSP-01**: AI advisories in Hindi/regional languages, plain-language explanations, natural-language questions (Gemini)
- **PRSP-02**: Persistence — short links and stored card snapshots (DynamoDB), cross-device saved places
- **PRSP-03**: Alerts — morning push / WhatsApp / SMS via EventBridge Scheduler
- **PRSP-04**: Static localisation of UI strings
- **PRSP-05**: Better data — more station networks, interpolation, forecast bias correction with a published track record
- **PRSP-06**: Wind trajectories and source apportionment
- **PRSP-07**: School/workplace views, indoor-air guidance, map view, PWA offline

## Out of Scope

| Feature | Reason |
|---------|--------|
| Accounts, logins, roles | No profile exists; the one preference (Sensitive) is device-local (PRD §3) |
| Database | State lives in URL + localStorage (ADR-0002) |
| Push notifications | Need scheduling infra; 48h build |
| AI features | Event rules say list AI tools used, not ship AI |
| Sub-kilometre / street-level claims | CAMS is ~45 km; Breeze labels itself regional — honesty constraint |
| Indoor air sensing, medical advice | Out of product bounds; footer disclaims |
| Locations outside India | India bounding box only |
| Native apps | Responsive web only |
| Six-pollutant dashboards, map view, ads, AR gimmicks | Anti-features — competitors ship them, none serve the one-decision promise (research FEATURES.md) |
| Persisted offline snapshots | First write-path for stored results; offline reuses in-memory cache only (grilling Q10) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLC-01 | Phase 2 | Pending |
| PLC-02 | Phase 2 | Pending |
| PLC-03 | Phase 2 | Pending |
| ASM-01 | Phase 2 | Pending |
| ASM-02 | Phase 2 | Pending |
| ASM-03 | Phase 4 | Pending |
| ASM-04 | Phase 1 | Pending |
| DEC-01 | Phase 1 | Pending |
| DEC-02 | Phase 1 | Pending |
| DEC-03 | Phase 1 | Pending |
| DEC-04 | Phase 1 | Pending |
| FCT-01 | Phase 2 | Pending |
| FCT-02 | Phase 2 | Pending |
| FCT-03 | Phase 2 | Pending |
| UAX-01 | Phase 4 | Pending |
| UAX-02 | Phase 4 | Pending |
| SHR-01 | Phase 5 | Pending |
| SHR-02 | Phase 5 | Pending |
| SHR-03 | Phase 5 | Pending |
| SHR-04 | Phase 5 | Pending |
| DEPL-01 | Phase 3 | Complete |
| DEPL-02 | Phase 3 | Complete |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0 ✓

Phase summary: Phase 1 = Core, API & Live Data (5) · Phase 2 = Web P0 (8) · Phase 3 = Deploy to Public URL (2) · Phase 4 = Hardening (3) · Phase 5 = Sharing & Submission (4).
v2 items (FR-18, FR-19, PRSP-01..07) are intentionally unmapped.

---
*Requirements defined: 2026-10-11*
*Last updated: 2026-10-11 after roadmap creation (22/22 mapped)*
