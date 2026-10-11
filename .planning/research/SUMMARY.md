# Project Research Summary

**Project:** Breeze — air-quality go/no-go verdict SPA (India, 48-hour hackathon build)
**Domain:** Serverless live-data consumer web app (React SPA + Hono/AWS Lambda, five free-tier upstream APIs)
**Researched:** 2026-10-11
**Confidence:** HIGH for stack versions and upstream API contracts (first-party docs + live tests); MEDIUM for architecture/deploy mechanics and market-level feature claims (multiple corroborating sources, no hands-on competitor testing)

## Executive Summary

Breeze is a decision-first air-quality app for India: instead of leading with an AQI number like every incumbent (IQAir, SAMEER, SAFAR, Plume), it opens with a three-word verdict ("Good to go / Take care / Stay indoors") backed by a provenance badge that honestly labels each value as station-measured or a ~45 km model estimate. Experts build this product exactly as the fixed PRD/ADRs prescribe: an npm-workspaces monorepo with a no-build pure-TS `@breeze/core` (all verdict/tip/window logic, client-side), a Hono API on Lambda arm64 behind a Function URL that *only normalises* four upstreams (Open-Meteo Air Quality, Open-Meteo Forecast, OpenAQ v3 stations, NASA FIRMS P2), and a Vite/React 19/Tailwind v4/TanStack Query v5 SPA on Amplify with URL-as-state (no DB, no accounts). Research validated every PRD API guess — notably OpenAQ's `bbox` order (west,south,east,north) and `current=pm2_5` support — and pinned all versions against the npm registry on 2026-10-11.

The differentiation research confirms is real and cheap: verdict-first screen, station-vs-model provenance chip, "cleanest 3-hour window", tips that cite their triggering value, and a shareable PNG verdict card for WhatsApp — three pillars (decision, provenance, share), everything else support. Deliberate anti-features (six-pollutant dashboard, maps, push alerts, accounts, AI advisories, Hindi retrofit) are correctly excluded for a 48-hour solo build; the single biggest acknowledged product gap is no Hindi UI, mitigated by keeping all copy in string constants.

The key risks are all execution-timing risks, not design risks: (1) Open-Meteo wall-clock time strings parsed with `new Date()` in the browser's timezone silently corrupt day boundaries — fix in `@breeze/core` with hour-index arithmetic + TZ-diff tests before any chart UI exists; (2) CORS configured in *both* the Lambda Function URL and Hono produces duplicate headers — one layer only, curl-verified; (3) deferring the first SAM+Amplify deploy to the end burns the Sat-6-PM public-URL cut rule — deploy a thin vertical slice mid-Saturday; (4) TanStack Query defaults (retry 3, staleTime 0) break the <3 s verdict promise; and (5) hackathon submission mechanics (video rules, steady commits, signed-out URL checks) can zero an otherwise finished project — treat submission as its own phase.

## Key Findings

### Recommended Stack (see STACK.md)

All stack layers were fixed by PRD §10/ADR-0001/0002; research pinned exact current versions (verified via npm registry 2026-10-11) and verified the five upstream API contracts against first-party docs (Open-Meteo, OpenAQ, FIRMS fetched directly; BigDataCloud live-tested). Key traps found: the Lambda adapter must be the standalone `@hono/aws-lambda@1.0.1` package (the `hono/aws-lambda` subpath is deprecated and removed in Hono v5), and the real SAM CLI comes from pip/brew, not npm.

**Core technologies:**
- React 19.3.0 + Vite 8.3.4 — SPA; static output Amplify serves directly (Node ≥ 20.19 required)
- Tailwind CSS 4.3.3 via `@tailwindcss/vite` — CSS-first config: design tokens in `tokens.css` `@theme{}`, no `tailwind.config.js`
- @tanstack/react-query 5.104.1 — retries/dedup/stale handling are load-bearing for fail-soft UX (but defaults must be overridden — see Pitfall 4)
- Hono 4.13.13 + `@hono/aws-lambda` 1.0.1 + `@hono/node-server` 2.1.4 — one codebase for Lambda and local dev
- zod 4.6.5 — query params + every upstream response parse
- TypeScript 5.9.3 (not 7.x native — tooling risk), Vitest 5.0.3
- AWS Lambda `nodejs24.x` arm64 (GA, LTS to 2028), AWS SAM CLI 1.168.0 (pip/brew)
- Optional P1: html-to-image 1.11.13 (share card), @fontsource Inter (self-hosted fonts), qrcode

**Verified upstream contracts (day-one saves):**
- OpenAQ `bbox=minLon,minLat,maxLon,maxLat` CONFIRMED; never use `coordinates`+`radius` (docs self-contradict); invalid bbox returns HTTP **500** in production; `/latest` can be hours old even on 200 OK; free tier 60 req/min, 2000/hr
- Open-Meteo `current=pm2_5` works; `forecast_days` 0–7 on AQ API; India resolves to CAMS Global ~45 km/3-hourly; **time strings are offset-less wall clock — never `new Date()` them**
- Geocoding `countryCode=IN` is real but still filter `country_code` client-side; empty results omit `results` entirely (zod default `[]`)
- FIRMS `DAY_RANGE` max 5, coordinates west,south,east,north; CSV columns need a smoke-script parse (MEDIUM confidence)

### Expected Features (see FEATURES.md)

Research validated PRD P0 as true table stakes and found Breeze's differentiation is genuine white space: no Indian competitor surfaces station-vs-model provenance, none offers a positive quantified "cleanest window", and all lead with a number rather than a decision. Confidence: MEDIUM (websearch-tier competitor evidence).

**Must have (P0, table stakes):** verdict card + reasons (FR-05/06) · current PM2.5 with source badge + confidence chip (FR-05/12) · place search + use-my-location with excellent deny-fallback (FR-01/02) · 48 h forecast chart — highest-complexity P0 UI item (FR-07) · best window ≥15% rule (FR-08) · rule-driven tips citing trigger values (FR-10) · sensitive toggle with instant zero-refetch recompute (FR-09) · weather strip, provenance footer, per-section fail-soft (FR-04/13) · perf + a11y gates (3 s verdict, <200 KB gz, Lighthouse ≥ 90, aria-live)

**Should have (P1, differentiators):** share card PNG + deep link (FR-15/16) — if only one P1 survives, "copy link" alone is the floor · saved places ≤5 localStorage · about/data-sources sheet

**Defer (v2+/P2):** FIRMS fire heuristic panel (wording discipline mandatory — "fire detections", never "stubble burning") · OG link preview · Hindi/regional i18n (biggest acknowledged gap; keep copy in string constants now) · PM10 one-liner (free — already fetched)

**Never this build (anti-features):** six-pollutant dashboard · map view · push notifications · accounts/sync · AI advisories · ads · historical trends · any mock/fallback data.

**Gaps flagged vs PRD:** copy-link should be treated as near-table-stakes (persona #4 is a WhatsApp group member); popular-city empty-state shortcuts need an explicit acceptance item; "AQI" vocabulary bridge line belongs in the about sheet; dark mode via `prefers-color-scheme` is ~free in the polish pass.

### Architecture Approach (see ARCHITECTURE.md)

Single BFF endpoint `GET /api/assess` normalises four upstreams into one `AssessResponse`; the browser computes all decisions via the shared no-build `@breeze/core` (the architectural *is* the differentiator — it's what makes the instant Sensitive toggle possible). Hard boundary rules: no verdict logic server-side, no upstream fetches from the browser, core does no I/O, nothing writes to a server. Dev loop is Vite proxy → Hono `dev.ts` on :8787 (zero CORS locally); prod CORS lives *only* on the Function URL.

**Major components:**
1. `@breeze/core` — pure TS, no build step (`exports` → `src/index.ts`), real workspace dep `"*"` (never tsconfig path aliases — they break SAM's temp-dir bundling); all decision logic + boundary tests
2. `apps/api` — Hono route `assess` (zod validate → India bbox → cache → `Promise.allSettled` 4 clients with 4 s aborts → normalise), in-memory TTL cache (15-min fresh / 3-h stale-while-error, per-instance optimization only), `lambda.ts`/`dev.ts` one-liner entrypoints
3. `apps/web` — URL-as-state router, TanStack Query (explicit non-default config), verdict/chart/tips UI, per-section ok/stale/unavailable rendering
4. Deploy — SAM (`--build-in-source` is required for workspace symlinks) + Amplify git-connected with root `amplify.yml` monorepo spec; **deploy mid-Saturday, not Sunday**

### Critical Pitfalls (see PITFALLS.md — 10 detailed)

1. **Open-Meteo wall-clock time parsing** — `new Date()` on offset-less strings corrupts day boundaries for any non-IST clock (judges, CI, NRIs). Fix: hour-index string arithmetic in core + `TZ=UTC` vs `TZ=Asia/Kolkata` diff tests, *before* chart UI.
2. **Double CORS** — Function URL config + Hono `cors()` = duplicate ACAO headers = opaque browser failure. One layer (Function URL), verify with curl from the deployed URL, not DevTools.
3. **Deploy deferred to the end** — AWS path (SAM bootstrapping, Amplify monorepo detection, origin chicken-and-egg) has the most unknowns and the PRD has a hard Sat-6-PM cut. Deploy a thin real slice Sat afternoon.
4. **TanStack Query defaults** — retry 3 + staleTime 0 + focus-refetch breaks the <3 s verdict and hammers a failing API. Explicit QueryClient defaults; Sensitive toggle must assert zero network.
5. **CPCB boundary/naming errors** — half-open intervals `[0,30] (30,60] …`, never round before categorizing; label "PM2.5 category (CPCB breakpoints)", never "AQI" next to an instantaneous reading; golden-value tests at 30/60/90/120/250.
6. **iOS Safari share-card capture** — first `toPng()` often blank; self-hosted fonts + `fonts.ready`; double-capture loop; download fallback; QA on a real iPhone Sat deploy exit, not Sunday morning.
7. **Amplify rewrite serving HTML for assets** — use `404-200`/extension-excluding rule, verify deep link in a signed-out private window.
8. **Submission mechanics** — video rules, steady commits (no squash), AI-tools list, submit midday Sunday; treat as its own phase.
9. **Lambda cache/timeout semantics** — cache is per-instance optimization, never semantic; `AbortController` 4 s per client, `allSettled` not `all`; blackhole-upstream fail-soft test.
10. **WCAG AA on the colour verdict** — amber `#E8A317` fails on white (~2.2:1); colour + icon + word everywhere; `aria-live`; greyscale test; contrast-check tokens before the chart consumes them.

## Implications for Roadmap

Research strongly suggests mapping roadmap phases to the PRD §18 48-hour delivery slots — the dependency analysis in ARCHITECTURE.md and PITFALLS.md's pitfall-to-phase table converge on the same order. **This is a hackathon build: phase count should stay tight and time-boxed, and the Sat-6-PM public-URL cut rule is a roadmap-level gate, not a task.**

### Phase 1: Core Contract & Decision Logic
**Rationale:** The §7.3 station-vs-model selection is the root of the entire decision tree; contract types let web and API be built in either order. Highest-risk correctness surface is pure logic — cheapest to test first.
**Delivers:** workspace scaffold (`tsconfig.base.json`, npm workspaces), `@breeze/core` types/config constants, then `categoryFor`/`verdictFor`/`selectEffectivePm25`/`bestWindow`/`buildTips`/geo helpers, full Vitest boundary matrix (all 12 category×profile cells, CPCB golden values), wall-clock time handling + TZ-diff tests.
**Addresses:** FR-05/06/08/09/10 logic layer.
**Avoids:** Pitfalls 1 (timezone), 2 (CPCB math/naming); anti-pattern 4 (no `dist` build for core).

### Phase 2: Upstream Clients + Day-One Live Verification
**Rationale:** An upstream surprise changes the contract, not the UI — so verify against live APIs Friday evening, in parallel with Phase 1. Most of the API research is already pre-paid (bbox order, limits, quirks above).
**Delivers:** four zod-validated clients with 4 s `AbortController` timeouts, `scripts/smoke-live.ts` proving 3+ places (metros + small towns), FIRMS CSV parse check, station-coverage mix measurement.
**Uses:** verified contracts in STACK.md (Open-Meteo ×2, OpenAQ v3, FIRMS P2, BigDataCloud).
**Avoids:** Pitfall 9 (OpenAQ axis order/500-on-invalid/units) — already resolved by research; the phase just executes the verification.

### Phase 3: API Route + Fail-Soft Orchestration
**Rationale:** Depends on Phases 1–2; single place where caching, timeouts, and typed per-section failures are written once.
**Delivers:** `GET /api/assess` (zod + India bbox → cache → `Promise.allSettled` → normalise), in-memory TTL cache with stale-while-error ≤ 3 h, `dev.ts` + Vite proxy dev loop, blackhole-upstream fail-soft test.
**Implements:** BFF Pattern 1 + cache Pattern 2 (ARCHITECTURE.md).
**Avoids:** Pitfall 5 (cache-as-truth, missing timeouts); anti-pattern 6 (verdict logic creeping server-side).

### Phase 4: Web P0 — Verdict, Chart, Tips, Provenance
**Rationale:** Can start against core types before Phase 3 finishes, but must integrate against the local API — never mocks (honesty constraint). The 48 h SVG chart is the single most complex P0 UI item; start it early in the phase.
**Delivers:** URL-as-state router (ADR-0002), TanStack Query wiring with explicit non-default config, VerdictCard, reading + source badge + confidence chip, forecast chart with bands/now-marker, tips, weather strip, per-section states, tokens.css with pre-validated contrast pairs.
**Addresses:** FR-01/02/03/04/05/07/11/12/13 + popular-city empty state (promoted gap item).
**Avoids:** Pitfall 4 (TanStack defaults), Pitfall 8 partially (tokens early).

### Phase 5: First Deploy — SAM + Amplify to Public URL
**Rationale:** The single most schedule-risky item; deploy mid-Saturday *while the UI can still absorb the evening's friction*. Hard gate: public URL by Sat 6 PM or P1/P2 is cut.
**Delivers:** SAM deploy (`--build-in-source`, Function URL, `NoEcho` key param, reserved concurrency 10), root `amplify.yml` + `AMPLIFY_MONOREPO_APP_ROOT` + `VITE_API_BASE_URL`, origin bootstrap ordering (Amplify first → read domain → first SAM deploy with correct allow-list), curl single-ACAO verification, signed-out deep-link check.
**Avoids:** Pitfalls 3 (double CORS), 7 (Amplify rewrite blank page); anti-pattern 3 (deploy-at-the-end).

### Phase 6: Sensitive Toggle, Failure States, Accessibility Pass
**Rationale:** Toggle is pure-core (low risk once Phase 1 lands); fail-soft and a11y are cross-cutting acceptance gates, not features — cheapest to finalize after main flows work end-to-end.
**Delivers:** instant zero-refetch toggle (assert zero network in test), total-failure "Can't assess" + Retry card, aria-live verdict, keyboard path through chart, greyscale/contrast audit, dark mode via `prefers-color-scheme`, reduced-motion.
**Avoids:** Pitfall 8 (WCAG AA colour verdict); dependency anti-pattern (weather unavailable must never blank the verdict).

### Phase 7: P1 — Share, Deep Link, Saved Places, About Sheet
**Rationale:** Sunday morning; deep link is *already* the URL-as-state mechanism so P1 is mostly rendering + Web Share plumbing. Share card is the demo-video hero shot — schedule it Sunday morning, not noon.
**Delivers:** 1080×1350 PNG card (double-capture, fonts.ready, download fallback), deep-link polish, ≤5 saved places, about sheet with the "CPCB's bands applied to the current reading" bridge copy + CC BY 4.0 attribution.
**Avoids:** Pitfall 6 (iOS Safari blank capture — real-iPhone QA is the exit check).

### Phase 8: P2 (Optional) — FIRMS Panel / OG Preview / PM10 Line
**Rationale:** Only if everything above is green. OG preview is last (adds a server-side rendering dependency, highest integration risk). FIRMS wording discipline is mandatory.
**Addresses:** FR-18/19 + PM10 opportunistic one-liner.

### Phase 9: Submission
**Rationale:** Its own phase with its own exit check — never merged into "final polish". Submission mechanics zero more finished hackathon projects than bugs do.
**Delivers:** public repo with organic commits (never squash during the event), README with run steps/architecture, ≤3:00 ≥720p video playing signed-out, writeup with required AI-tools list + credits/licences, submit midday Sunday with a re-record slot held.

### Phase Ordering Rationale

- Effective PM2.5 → category → verdict → tips is a strict dependency chain (FEATURES.md dependency graph) — core logic must precede all UI that displays its output.
- Upstream verification is deliberately pulled forward to Friday: an API contract surprise is cheapest when only the contract types need to change.
- Deploy is placed *mid*-timeline, not last, because it has the highest unknown-density and the PRD's cut rule makes lateness terminal — this is the one ordering decision that contradicts the natural "build then ship" instinct.
- Share card lands after deep link because the card prints the URL.
- P2 items and all anti-features are excluded by design, not by accident.

### Research Flags

Needs research during planning: **none critical** — research pre-paid most integration risk. Watch items:
- **Phase 5 (Deploy):** Amplify console behavior and SAM bootstrapping drift fast; if the first deploy stalls > 30 min, fall back to the documented alternatives (API Gateway HTTP API, `nodejs22.x`) already listed in STACK.md.
- **Phase 7 (Share card):** html-to-image iOS quirks are community-verified workarounds, not guarantees — have the download-fallback design ready as the degradation path.

Standard patterns (skip research-phase):
- **Phases 1, 3, 4:** pure-TS core + Hono route + React wiring — well-documented, contract fixed by ADRs.
- **Phase 2:** upstream contracts already verified first-party on 2026-10-11; the phase executes the smoke script, it doesn't research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions from npm registry same-day; Open-Meteo/OpenAQ/FIRMS contracts from first-party docs; MEDIUM only on BigDataCloud terms and Lambda runtime table (marketing pages/snippets) |
| Features | MEDIUM | Competitor evidence from websearch-tier sources, no hands-on testing or user interviews; PRD-internal self-consistency checks are HIGH |
| Architecture | MEDIUM | Findings cross-checked ≥2 independent sources; SAM-workspace `--build-in-source` finding triple-corroborated; classifier tier caps scraped sources at MEDIUM |
| Pitfalls | MEDIUM-HIGH | Most individual facts backed by official docs (AWS, CPCB primary PDF, Open-Meteo tracker, TanStack docs); submission-rules guidance is event-specific MEDIUM |

**Overall confidence:** HIGH on "what to build and with what"; MEDIUM on "how the market will receive it" and day-of-deploy AWS behavior — both mitigated by the phase design (deploy early, video as artifact of record).

### Gaps to Address

- **Station coverage per city tier (metro/tier-2/town):** unresolvable from docs; Phase 2's smoke script measures it — tunes confidence thresholds, not code paths.
- **FIRMS CSV column drift:** MEDIUM-confidence column list; assert in the Phase 2 smoke script before trusting the P2 panel schema.
- **BigDataCloud long-term terms:** fine for the hackathon; no hard SLA/quota — fail-soft to "Your location" is already the design; re-check before any commercial use (Open-Meteo's non-commercial clause would block that anyway).
- **Hindi/regional UI:** HIGH product gap, accepted scope cut; mitigation is mechanical (string constants now) — record as a known limitation in the writeup.
- **Event-specific submission rules:** re-check against the actual event's page before Phase 9 — the researched rules are aggregate community guidance.
- **Empty-state popular-city shortcuts + dark mode:** promoted from PRD prose to explicit acceptance items in Phases 4/6 respectively.

## Sources

### Primary (HIGH confidence)
- Open-Meteo docs (air-quality-api, forecast, geocoding, pricing) — `current` support, forecast_days ranges, CAMS Global resolution/cadence, free-tier limits, timeformat quirk
- docs.openaq.org (geospatial, locations, latest, examples, rate-limits) — bbox order, sensor mapping, latest flow, 60/min + 2000/hr limits
- firms.modaps.eosdis.nasa.gov/api/area — area CSV contract, DAY_RANGE 1–5, MAP_KEY transaction limits
- api.bigdatacloud.net reverse-geocode-client — live contract test 2026-10-11
- AWS Lambda / Amplify Hosting official docs — Function URL CORS, execution-environment lifecycle, monorepo config, rewrites
- CPCB "National Air Quality Index" report + app.cpcbccr.com calculator — breakpoints, 24-h averaging, truncation, interpolation
- hono.dev docs + Context7 `/honojs/hono` — `@hono/aws-lambda` migration, Function URL 2.0
- npm registry queries 2026-10-11 — all pinned versions; PyPI `aws-sam-cli` JSON
- TanStack Query official docs — defaults, retries, error-staleness
- Open-Meteo issues #488/#1333/#1545/#1764; openaq-api issue #388; html-to-image issue #488/PR #585 — maintainer-confirmed quirks
- Internal: PRD.md §5–§19, ADR-0001/0002, PROJECT.md, CONTEXT.md — project spec (HIGH)

### Secondary (MEDIUM confidence)
- BreatheSafeAir app round-up (updated Aug 2026), app-store listings, SAFAR/IQAir product pages — competitor feature evidence
- India press coverage of IQAir-vs-SAMEER discrepancies — provenance-trust gap rationale
- SO Q79230926 + aws/aws-sam-cli #6567 — `--build-in-source` for workspace symlinks (triple-corroborated)
- SO Q76944724 + r/aws + OneUptime — CORS duplicate-header failure mode (4 corroborations)
- Nx/Moonrepo/adiun monorepo guides — bundler-transpile / tsc-typecheck consensus, alias pitfalls
- AWS Compute blog + Lambda runtimes search snippets — nodejs24.x GA, nodejs22.x EOL Apr 2027

### Tertiary (LOW confidence — validate during execution)
- Devpost/MLH/ETHGlobal aggregate submission rules — event-specific; re-check against actual event page
- Low-bandwidth India mobile studies (ICSEA 2025, engineering blogs) — performance-as-table-stakes rationale
- BigDataCloud marketing "no rate limit" claim — no SLA; treat as best-effort

---
*Research completed: 2026-10-11*
*Ready for roadmap: yes*
