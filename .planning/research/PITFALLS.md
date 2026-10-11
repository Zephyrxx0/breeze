# Pitfalls Research

**Domain:** Live-data air-quality SPA + serverless Hono/Lambda API, hackathon submission (Breeze)
**Researched:** 2026-10-11
**Confidence:** MEDIUM (all findings cross-checked against primary sources — AWS docs, CPCB's own AQI report PDF, Open-Meteo docs + tracker issues, official Amplify/TanStack docs, community issue threads; classifier tier for verified websearch is MEDIUM, individual facts corroborated by official docs are noted inline)

## Critical Pitfalls

### Pitfall 1: Date-parsing Open-Meteo wall-clock strings in the browser timezone

**What goes wrong:**
Open-Meteo with `timezone=auto` (default format `iso8601`) returns naive local wall-clock strings like `"2026-10-09T14:00"` with **no UTC offset**. `new Date("2026-10-09T14:00")` parses that as the *browser's* local time. A user in a different timezone than the queried location (or a dev machine on UTC) gets data shifted by hours: "now" lands on the wrong forecast hour, the Today/Tomorrow tab splits on the wrong day boundary, the daytime (06:00–20:00) mean includes night hours, and the best-window chip recommends a 3-hour block that isn't actually clean. India has no DST, so this is a *location-tz vs browser-tz* bug, not a DST bug — which makes it easy to miss on one machine and guaranteed to appear for NRIs, judges abroad, or CI runners on UTC. (Open-Meteo docs confirm timestamps use `utc_offset_seconds` resolved at request time; issues #488, #1545, #1764 all stem from this design.)

**Why it happens:**
ISO-looking strings *feel* parseable; `new Date()` silently succeeds and produces plausible-but-wrong values. The correct approach (parse as location-local, or use `timeformat=unixtime` + format with the response `timezone`) requires knowing the API contract detail that the offset is not embedded.

**How to avoid:**
- Parse `hourly.time` strings manually (`split('T')`, treat date+hour as location-local wall clock) in `@breeze/core` — never hand them to `new Date()` for arithmetic. Alternatively request `timeformat=unixtime` and do day-bucketing against the response's `timezone` id.
- All day-boundary math (Today/Tomorrow, 06:00–20:00 mean, 05:00–21:00 window restriction, night shading) must be pure string/hour-index arithmetic on the location's clock — which also keeps the core package deterministic and testable (ADR-0001).
- Add unit tests that run with `TZ=UTC` and `TZ=Asia/Kolkata` and assert identical outputs; add one smoke assertion that the "now" hour of the forecast matches the location's current local hour within ±1.

**Warning signs:**
- Any `new Date(` call anywhere in `apps/web` or `packages/core` that touches an upstream timestamp.
- Chart "now" marker visibly not at the current hour in the API playground; "Tomorrow" tab showing tonight's late hours.
- Tests pass locally (IST machine) but differ in CI (UTC).

**Phase to address:**
Core decision-logic phase (with the unit tests) — before any chart UI is built. Re-verify in the Web UI phase with a `TZ=UTC` run.

---

### Pitfall 2: Reporting a "current AQI" from instantaneous values, and boundary/rounding errors at CPCB breakpoints

**What goes wrong:**
Two sub-failures, both credibility-killers in a demo:
1. **Naming.** CPCB's NAQI is formally computed from **24-hour averages** (min 16 h of data, worst sub-index across ≥3 pollutants). Breeze applies the same breakpoints to current/hourly values — legitimate, but if the UI or video says "AQI" instead of "PM2.5 category", an informed judge reads it as a methodology error.
2. **Math.** CPCB's published table is integers (0–30, 31–60, …), leaving gaps at fractional readings. Rounding first (e.g. `Math.round(30.4) → 30`, `30.6 → 31`) mis-buckets and breaks the linear sub-index at band edges; using **US EPA** breakpoints by mistake (Good up to 9.0 µg/m³) flips most Indian readings to "unhealthy". Official CPCB method also *truncates* the concentration (PM2.5 to 1 decimal) before interpolating.

**Why it happens:**
The breakpoint table is copied from a visual chart with integer endpoints; "AQI" is the colloquial word everyone uses. Both silently drift from the spec.

**How to avoid:**
- Implement bands as the half-open continuous intervals already decided (PROJECT.md Key Decisions): `[0,30] (30,60] (60,90] (90,120] (120,250] (250,∞)`, never round before categorizing.
- Label the output "PM2.5 category (CPCB breakpoints)" everywhere — UI, share card, video — and keep the PRD's honest framing. Footer already disclaims "not medical advice".
- Unit-test every boundary (30/30.1, 60/60.1, 90/90.1, 120/120.1, 250/250.1) plus a couple of CPCB's own published examples (sub-index 51 at 31 µg/m³, 100 at 60 µg/m³) as golden values.
- Keep all constants in one config module in `@breeze/core` (PRD §7 opening) so a breakpoint fix is one line.

**Warning signs:**
- The word "AQI" appears in UI copy next to a single instantaneous reading.
- Category flickers between two states at values like 30.5 during chart hover.
- Verdicts differ from CPCB's own calculator (cpcbccr.com/aqi-calculator) for the same input.

**Phase to address:**
Core decision-logic phase (unit tests are the gate). Copy audit in the Polish/a11y phase.

---

### Pitfall 3: CORS configured twice — Function URL CORS + Hono middleware produce duplicate headers

**What goes wrong:**
The Amplify SPA calls a cross-origin Lambda Function URL. If CORS is enabled on the Function URL **and** Hono's `cors()` middleware also emits `Access-Control-Allow-Origin`, every GET response carries the header **twice** (`*, *` or two origins) and browsers reject it with an opaque CORS error that hides the real response. Conversely, with URL-level CORS enabled, AWS answers OPTIONS itself and **Lambda never sees the preflight** — so any OPTIONS handler written in Hono silently does nothing, and debugging "why is my OPTIONS route not firing" wastes hours. Additional documented traps: AllowHeaders entered comma-separated in one console field (must be one per line), Max-Age left blank behaving inconsistently vs `0`, and code error-paths that throw before your CORS-header wrapper runs, so the 5xx reaches the browser with no ACAO header and shows up as "CORS error" instead of the actual bug. Exact-origin matching also means the default Amplify URL must be added to `AllowedOrigin` *after* the first Amplify deploy (PRD §13 step 4) or the freshly deployed app is dead on arrival.

**Why it happens:**
"Add CORS in code" is the reflex from API Gateway tutorials; Function URL CORS is a second, AWS-managed layer. CORS errors are also the browser's generic mask for any network-layer failure, so misattribution is common.

**How to avoid:**
- Pick **one** layer: configure CORS on the Function URL in the SAM template (`FunctionUrlConfig.Cors` — already in PRD §13's sketch) and do **not** add `hono/cors` in `app.ts` for production. If local dev needs different origins, use a dev-only conditional, never both unconditionally.
- Verify with curl, not the browser: `curl -i -H "Origin: https://<amplify-url>" https://<furl>/api/assess?lat=19.07&lon=72.87` must show exactly one ACAO; `curl -X OPTIONS` with `Origin` + `Access-Control-Request-Method: GET` must return 200/204 with the allowed origin. A missing `Origin` header in the curl test makes working CORS look broken.
- Order deploys: SAM deploy → get Function URL → set `VITE_API_BASE_URL` + `AllowedOrigin` → redeploy API → smoke test from the real Amplify origin.

**Warning signs:**
- DevTools: "The 'Access-Control-Allow-Origin' header contains multiple values".
- OPTIONS requests appearing in CloudWatch logs when URL CORS is supposedly enabled (means it's disabled, or vice versa).
- Works on localhost but fails on the Amplify URL (origin not yet allow-listed).

**Phase to address:**
Deploy phase (Sat afternoon slot) — the curl verification is part of the exit check, not an afterthought.

---

### Pitfall 4: TanStack Query defaults break the 3-second verdict and the fail-soft contract

**What goes wrong:**
Library defaults fight Breeze's core promise in three ways:
1. **`retry` defaults to 3 with exponential backoff** (1s, 2s, 4s…). On total upstream failure the user stares at skeletons for ~7+ s before the error/Retry card appears — violating "verdict visible < 3 s" and the fail-soft design. Meanwhile *partial* failures inside `/api/assess` are already handled server-side, so client retries mostly amplify a dead API.
2. **Error-state queries are always stale** (no cached data) — every window-focus, remount, or reconnect silently re-fires the request regardless of `staleTime`, hammering a failing Lambda and burning the tiny budget; combined with default `retry:3` this multiplies into bursts.
3. **`staleTime` defaults to 0** — tab switching refetches constantly, and if the query key doesn't include the coordinates you get cache races showing the previous city's verdict under the new city's name.

**Why it happens:**
Defaults are tuned for typical CRUD apps; nobody reads the "Important Defaults" page until production traffic looks weird.

**How to avoid:**
- Set deliberate defaults on the `QueryClient`: `retry: 1` (or 0 with a manual Retry button — matches the PRD's explicit Retry affordance), `staleTime` aligned to the server cache TTL (~60 s), `refetchOnWindowFocus: false`, and `retryOnMount: false` for the assess query once it has errored.
- Query key = `['assess', lat, lon, profile-relevant params]` — every parameter in the key (TkDodo rule). The Sensitive toggle must **not** invalidate/refetch: it recomputes from cached response via `@breeze/core` (ADR-0001) — assert this in a test (zero network calls on toggle).
- Distinguish UI states explicitly: TanStack `isError` (total failure → "Can't assess" + Retry) vs API-reported per-section `unavailable`/`stale` (partial → section-level messaging). Don't let the query layer collapse these.

**Warning signs:**
- CloudWatch shows 4+ `/api/assess` invocations per user action.
- Network tab shows requests firing on every tab focus.
- Skeletons visible > 3 s on an airplane-mode test.
- Verdict text belongs to the previously viewed city for a frame after search.

**Phase to address:**
Web UI phase (first fetch wiring); re-check in the Error/states phase (Sat evening slot).

---

### Pitfall 5: In-memory TTL cache treated as a source of truth across N Lambda environments

**What goes wrong:**
Each Lambda execution environment (Firecracker microVM) has **its own isolated memory**. With scaling, the TTL cache exists N times over: two users in Delhi may hit different cold environments and trigger duplicate upstream bursts; a warm environment can be frozen/discarded at any time, so "cache hit rate" expectations from a single-node mental model never materialize. Worse failure mode: treating the cache as authoritative — serving a cached verdict without its `fetchedAt` age breaks the honest `stale` semantics (Key Decision: `stale` = cache-fallback with `ageMin`), and a bug that trusts the cache to decide "live" would show a days-old reading as fresh. Cold starts (<1% steady-state, but every scale-out pays ~0.1–1 s for Node init) also mean the first user after quiet periods eats the 5 s cold p95 alone — and if upstream calls aren't wrapped in `AbortController` with the 4 s timeout, one hung upstream exceeds the 10 s Lambda timeout and kills the whole response instead of degrading one section.

**Why it happens:**
"In-memory cache" is a single-process concept; FaaS execution environments make "process" a moving, multiplying, disposable set. Single-request timeout discipline is easy to skip while wiring parallel fetches.

**How to avoid:**
- Design the cache as a pure optimization: response **always** carries per-section `fetchedAt`/`age`/`status`, correctness never depends on a hit. `Promise.allSettled` (not `Promise.all`) over the four upstream clients, each with its own 4 s `AbortController` timeout, each failure → typed `unavailable` for that section.
- Call upstreams in parallel in the handler; keep the Init phase minimal (move nothing heavy into module scope that isn't reused).
- Reserved concurrency 10 (per PRD) bounds both abuse and the number of cache copies; budget alert as backstop.
- Smoke script should include a "kill one upstream" mode (point a client at a blackhole URL) asserting the response still returns 200 with that section `unavailable` — fail-soft proven, not assumed.

**Warning signs:**
- CloudWatch log shows a full upstream fan-out for a request 30 s after an identical one (different environment — expected; constant — suspicious).
- Any response field derivable only from cache state (i.e., cache affecting semantics, not latency).
- p95 far above 2.5 s warm, or `Task timed out` entries.

**Phase to address:**
API phase (assess orchestration) — the all-settled + timeout + typed-failure shape is written once, here; verify in the smoke/deploy phase.

---

### Pitfall 6: iOS Safari share-card capture returns a blank or partial PNG

**What goes wrong:**
The share card (P1) is the demo's "wow" moment and the most Safari-fragile piece. Documented html-to-image failure modes on iOS/Safari: the **first** `toPng()` call often resolves before WebKit finishes painting and yields a blank/partial image (community-verified loop-until-dataURL-length-stops-growing workaround; PRD already says "run twice" — implement it, don't just note it); **cross-origin images and external SVGs are silently dropped**; any non-CORS resource (including CSS `background-image`, which cannot carry `crossorigin`) **taints the canvas** so `toDataURL` throws `SecurityError`; missing fonts render fallback glyphs if `document.fonts.ready` wasn't awaited; and iOS canvas-size limits are device-RAM-dependent (a 1080×1350 card at pixelRatio 2 = 2160×2700 is safe, but oversized off-screen wrappers can exceed limits on older iPhones). Web Share API `navigator.canShare({files})` support is patchy — Safari desktop has no file share at all, so the download-fallback path must exist, not be aspirational.

**Why it happens:**
DOM-to-canvas is a browser race plus a security boundary, not a library bug; it works perfectly on the dev's Chromium laptop, which is exactly where it gets demoed before the phone test.

**How to avoid:**
- PRD §15 gotchas are the spec: self-hosted fonts (@fontsource) + `await document.fonts.ready` before capture; same-origin images only (inline as data URLs if needed); capture the off-screen 540×675 node at pixelRatio 2; call `toPng` twice (or until output length stabilizes) on WebKit; guard with `navigator.canShare?.({files})` and always keep the download-PNG + copy-link fallback.
- Manual QA matrix (PRD §17) includes iOS Safari share flow — run it on a **real iPhone over mobile data** as part of the Sat deploy exit check, not Sunday morning.
- Wrap capture in try/catch: a `SecurityError` should degrade to the download path with the link, never a dead button. Share stays disabled when no verdict exists (Key Decision) — that also prevents capturing the error card.

**Warning signs:**
- Share works in Chrome dev, "sometimes empty" in Safari (first-call race).
- Console: `SecurityError: Tainted canvases may not be exported`.
- Card shows fallback font or missing wordmark in the preview.

**Phase to address:**
P1 share-card phase (Sun AM) — with the real-iPhone QA as its exit check; risk rehearsed in the Sat evening states phase if time allows.

---

### Pitfall 7: Amplify rewrite rule serves index.html for missing assets — silent blank page in production

**What goes wrong:**
Amplify Hosting needs an SPA rewrite so deep links don't 404. The documented blunt rule `/<*>` → `/index.html` (status 200) rewrites **everything**, including requests for assets that failed to upload — the browser receives HTML where it expects JS/CSS and renders a blank page with only MIME-type console errors. Rule **order** matters (first match wins; a misplaced rule took real sites fully offline for hours per community reports). Also: `baseDirectory` in Amplify build settings must match Vite's `dist` output (not `build`) or routes return Access Denied, and the default 404-rewrite variant (`"status": "404-200"`, target `/index.html`) is the safer form because it only fires for genuinely missing paths. Breeze's deep links are query-string based (`/?lat=..&lon=..`), so the *path* is always `/` — which lowers exposure, but hard reloads of any stray path and the OG-preview route (P2) still depend on correct rules.

**Why it happens:**
Docs show the blanket rule first; "it loaded once" after deploy hides asset-path breakage; SPA 404s only appear when someone shares a deep link — exactly the moment the share feature succeeds.

**How to avoid:**
- Use the `404-200` (or the extension-excluding regex) rule targeting `/index.html`; verify rule order; set `baseDirectory: dist`.
- Post-deploy checklist: load `/`, hard-reload `/`, open `/?lat=19.07&lon=72.87&n=Mumbai` in a **signed-out private window**, and confirm a deliberately bad asset URL still returns 404 (not HTML).
- The demo video ends with the public URL (storyboard beat 6) — every URL shown in the video must be opened signed-out beforehand (also a submission rule at many events).

**Warning signs:**
- Blank white page with console `Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/html"`.
- Deep link works from the app but 404s when pasted into WhatsApp (missing rewrite for that path).

**Phase to address:**
Deploy phase — deep-link-load-in-private-window is an exit criterion alongside the phone test.

---

### Pitfall 8: WCAG AA failures on the colour-coded verdict — amber contrast and colour-as-only-signal

**What goes wrong:**
The verdict card is a status conveyed by colour, the exact case WCAG targets. Concrete trap: token amber `#E8A317` on the soft-white surface is ~2.2:1 — fails both text contrast (4.5:1) and the 3:1 non-text/UI-component minimum if used as a chip or band border on white; the gradient verdict backgrounds must be checked at their **lightest stop**, not the brand mid-tone, and the "dark text on amber" note in PRD §14 needs actual measurement, not intent. Beyond colour: 1.4.1 requires a non-colour signal (icon + words — PRD mandates, but the chart's category bands, best-window highlight, and confidence chip each need it too); 4.1.3 needs `aria-live` for verdict changes; the hand-written SVG chart needs keyboard-reachable points with visible focus and `prefers-reduced-motion` respected by the wave animation. Lighthouse a11y ≥ 90 does not catch gradient contrast or colour-only semantics — it happily passes pages that fail a manual audit.

**Why it happens:**
Design tokens get chosen aesthetically; contrast is checked (if at all) on the most prominent text, not every pair; automated audits give false confidence.

**How to avoid:**
- Run every token pair through a contrast checker **before** the tokens land in `tokens.css`; pick the gradient's worst stop as the test point; darken the amber token for on-white use until it clears 4.5:1 for text / 3:1 for large text and borders.
- Verdict = colour **+ icon + word** on the card, share card, and any chart legend; category bands also pattern- or label-distinguishable.
- `aria-live="polite"` on the verdict region; reduced-motion media query kills the wave; chart points are focusable with an accessible name ("Delhi, 3 PM, 96 µg/m³, Poor").
- Add a manual axe/contrast pass to the Sat evening accessibility slot's exit check, not just Lighthouse.

**Warning signs:**
- Any hex token in `tokens.css` you can't state the contrast ratio of from memory.
- Verdict meaning distinguishable in a greyscale printout of the screenshot (test it).
- Chart unreachable by keyboard (Tab never lands on data points).

**Phase to address:**
Token definition early (UI phase) + dedicated accessibility pass (Sat evening slot) — cheaper to fix tokens before the chart and share card consume them.

---

### Pitfall 9: OpenAQ v3 geospatial quirks — bbox axis order, 500-on-invalid, sparse-coverage misread

**What goes wrong:**
1. **Axis order.** OpenAQ v3 `bbox` is `(minX, minY, maxX, maxY)` = **(west-lon, south-lat, east-lon, north-lat)** — lon-first, the *opposite* of the sibling `coordinates` param which is (lat, lon). Mixing the two conventions yields empty results (silent) or nonsense boxes; PRD §8 already flags "docs examples disagree" — this is the confirmed resolution: lon,lat.
2. **Error semantics.** An invalid bbox makes production return **HTTP 500** (issue #388), so a malformed request looks like an OpenAQ outage in CloudWatch and in fail-soft logic — a 500 from one upstream must still map to `unavailable` for the station section only.
3. **Coverage.** Sparse station coverage outside metros means the model-estimate path is the *majority* path in many towns — if the Friday verification is skipped, the station code path can be effectively untested and then break loudly in the demo's tier-2 city, or worse, a units/param mismatch (parameter id 2 = pm2.5, values in µg/m³; some parameters elsewhere are ppm) silently feeds wrong magnitudes into the verdict.

**Why it happens:**
Two coordinate conventions in one API; upstream errors surfacing as 5xx; happy-path testing on metros only.

**How to avoid:**
- Friday day-one verification (PRD §8) is the gate: call `bbox={west},{south},{east},{north}` for 3 metros + 2 small towns, print the raw response, assert PM2.5 parameter + µg/m³ units.
- Validate lat/lon server-side (zod + India bounding box) before any upstream call, so OpenAQ never sees a malformed bbox from us.
- The station-selection logic (median of nearest three / nearest one / haversine 25 km, §7.3) is pure — unit-test it with recorded fixtures from the Friday pull (fixtures in tests are allowed; fixtures in product code are not).
- Treat model-estimate as the designed default: the UI copy, confidence chip (Low), and smoke-script output ("station-vs-model mix") make the fallback visible rather than surprising.

**Warning signs:**
- OpenAQ 500s in CloudWatch with request ids but no client 4xx preceding them.
- Every small-town query returns model-only AND the station path never executes in any test.
- PM2.5 values of order 0.01 (wrong units) or negative (invalid reading not filtered).

**Phase to address:**
API clients phase, gated by the Friday-evening live-verification slot. Coverage mix is a standing item in the smoke script.

---

### Pitfall 10: Hackathon submission mechanics — the project exists but scores zero

**What goes wrong:**
Community-documented disqualification and zero-score modes across Devpost/MLH/ETHGlobal-style events, mapped to Breeze's specific risks:
- **History.** Repo must start at/after the event start (9 Oct) with organic commits; a squashed single commit or any pre-event code triggers disqualification review. Breeze's repo is fresh (good) — the risk is an end-of-event mega-commit or force-push "cleanup".
- **Prior work.** Aerate/Calm are reference-only; even *concept* porting with recognisable copied UI text/code can be challenged. Listing credits/licences (CAMS CC BY 4.0 attribution!) is mandatory in the writeup and UI.
- **Video rules.** Common auto-rejects: over the time cap (3:00 here), below 720p, sped-up footage, plays-only-with-sound-off music edits, must play **signed out**; some events require the event name stated at the start.
- **Deadline & access.** Submissions near the deadline fail uploads; judges get score 0 on private repos/docs/video links; forgotten required fields (AI-tools list is explicitly required by this event per PROJECT.md).
- **Demo-day reality.** Live URL dies during judging because the Lambda hit its budget alert, an upstream rate-limited, or the free-tier account needed re-verification — the video must show the app working, and the URL must survive after submission.

**Why it happens:**
All energy goes into code; the submission checklist is treated as Friday-night paperwork instead of a deliverable with its own time box.

**How to avoid:**
- Treat PRD §18's submission checklist as a phase with an exit check: repo public, README with run steps + env vars + architecture, ≤3:00 video that plays signed-out (test on a fresh browser profile), writeup with AI-tools list + credits + licences.
- Commit steadily through the weekend (also satisfies "history shows progress"); never squash/force-push the main branch during the event.
- Hard cut rule already protects the deadline (no public URL by Sat 6 PM ⇒ drop P1/P2) — enforce it; a working P0 submitted early beats a broken P1.
- Rehearse the video end-to-end once on Saturday's deployed URL before Sunday's recording; keep the CloudWatch "live upstream call" log lines ready (they're storyboard beat 5 and proof of live data).
- Submit Sunday **midday**, hours before the deadline, then only fix genuine breakage.

**Warning signs:**
- Last commit is a 40-file "final" commit.
- Video still unscripted on Sunday morning.
- Any submission-field checkbox still unvisited the night before.
- Demo depends on a single upstream staying generous on the final day (mitigate: the video is the artifact of record; keep a re-record slot).

**Phase to address:**
A dedicated Submission phase (Sun midday slot) — never merged into "final polish" time.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Handle CORS in Hono code instead of Function URL config | "Works locally the same way" | Duplicate-header failures, OPTIONS routes that never fire, per-error-path header bugs | Never in this architecture — URL-level CORS is the single source of truth |
| Skip `AbortController` timeouts on one upstream | Fewer lines while wiring | One hung upstream eats the 10 s Lambda timeout; whole verdict fails instead of one section | Never — 4 s timeout is a per-client invariant |
| `Math.round` before categorizing | Trivial code | Boundary mis-buckets; diverges from CPCB interpolation | Never in product code (fine in prose) |
| localStorage verdict cache for offline | Impressive offline demo | Days-old verdict shown as live — violates the core honesty promise (Key Decision 2) | Never — offline shows in-memory cache or explicit error (Decision 10) |
| Poll `/api/assess` with `refetchInterval` | "Feels live" | Upstream quota burn, budget risk, no user-perceived gain (air quality moves slowly) | Only if ever, with long interval + visible "updated X min ago"; default is manual/60 s staleTime |
| Squash commits before submission | Tidy history | Disqualification risk (history must show in-event progress) | Never during the event |
| Copy reference-project UI text | Speed | Originality/eligibility challenge | Never — write copy fresh (PRD copy rules already unique) |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Open-Meteo (Air Quality + Forecast) | `new Date(naiveLocalString)` in browser tz; assuming DST-aware timestamps | Parse wall-clock strings as location-local; day math on hour indices; `timezone=auto` for upstream, own arithmetic downstream (Pitfall 1) |
| OpenAQ v3 | bbox as lat,lon,lat,lon; treating 500 as outage; trusting `/latest` without sensor→parameter mapping | bbox = west,south,east,north (lon first); validate input first; parameter id 2, µg/m³ check; median-of-nearest-three per §7.3 |
| Lambda Function URL | CORS both at URL level and in Hono; comma-joined AllowHeaders | One CORS layer (URL config); one header per line; curl-verify single ACAO (Pitfall 3) |
| Hono on Lambda | Heavy work in module scope; assuming warm envs; `Promise.all` over upstreams | Minimal Init; module state = optimization only; `Promise.allSettled` + per-client 4 s abort |
| Amplify Hosting | Blanket 200 rewrite; wrong baseDirectory; adding origin after deploy without API redeploy | `404-200` or extension-excluding rewrite, order checked; `dist`; deploy → origin → redeploy API (Pitfall 7) |
| html-to-image / Web Share | First-call blank on Safari; cross-origin assets; assuming `canShare` exists | Double-capture; self-hosted fonts + `document.fonts.ready`; same-origin only; guarded download fallback (Pitfall 6) |
| TanStack Query | Library defaults (retry 3, staleTime 0, focus refetch) | Explicit QueryClient defaults; params in query key; toggle recomputes client-side with zero refetch (Pitfall 4) |
| NASA FIRMS (P2) | Calling detections "stubble burning"; ignoring MAP_KEY rate limits | "Fire detections… an indication, not a measurement" (§7.6); only after P0/P1 are safe |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Serial upstream calls in assess | p95 near 4 s+; slow tier-2 responses | Parallel fetch with per-client 4 s abort (PRD lifecycle step 3) | Breaks the 2.5 s warm p95 with any one slow upstream |
| TanStack retry storm on a dead API | CloudWatch bursts of 4× invocations/user action | `retry: 0–1`, `retryOnMount: false` on error | Any upstream outage day; burns free-tier quota |
| Cold-start p95 on first demo click | 5–8 s first load in the video | Record after one warm-up click; keep Init light; p95 cold budget 5 s acknowledged | Demo video beat 2 (live walkthrough) |
| 200-rewrite asset masking | Blank page, MIME errors | Extension-excluding / 404-200 rewrite (Pitfall 7) | First shared deep link |
| Oversized off-screen share node | Blank/partial card on older iPhones | Fixed 540×675 @2x capture node; iOS canvas-size awareness | P1 share on low-RAM devices |
| Unbounded in-memory cache growth | Rare at hackathon scale | Simple TTL eviction on write; entries keyed by rounded lat/lon only | Only beyond event scale — noted, not over-engineered |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `OPENAQ_API_KEY` (and FIRMS key) bundled into the SPA or repo | Key theft, quota exhaustion, ToS breach | Keys only in Lambda env vars (SAM `NoEcho` parameter); `grep` the built `dist/` for the key before deploy; `.env` files never committed |
| CORS `AllowOrigins: *` left in production | Any site can drive your Lambda (cost abuse) | Allow-list exact Amplify origin + localhost only for dev; reserved concurrency 10 caps blast radius; budget alert ~USD 5 |
| Logging full coordinates / user strings | Privacy承诺 broken (PRD §16: logs at 1 dp) | Structured log line contains rounded coords + request id only; assert in code review of `assess.ts` |
| Unvalidated lat/lon passed to upstreams | SSRF-adjacent abuse, OpenAQ 500s, cache poisoning of odd keys | zod parse + India bounding box check + rounding before cache keying |
| Trusting upstream values blindly (negative PM2.5, wrong units) | Absurd verdicts; "Severe" from a −999 sentinel | zod-parse every upstream response; drop negatives; unit check; typed failure otherwise |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Loading skeletons longer than the verdict promise | User bails or distrusts the app | Optimistic place label instantly; verdict in < 3 s warm; skeletons only for sections still fetching |
| Model estimate shown like a station reading | False confidence; the honesty story collapses | Source badge (station name/distance/age vs "model estimate ~45 km") + confidence chip on every value (FR-02) |
| "Best window" recommending Poor air | Actively harmful advice | Window chip only at ≥15% improvement; tip A3 suppressed when window mean ≥ 91 µg/m³ (Key Decision 6) |
| Sensitive toggle causing a refetch flash | Perceived jank; contradicts ADR-0001 | Pure client recompute from cached response — no network, no skeleton |
| Stale data without an age shown | Snapshot shared in a family chat goes silently wrong | Every stale/unavailable section states its age; share card stamped from `measuredAt`; share disabled without verdict (Decision 9) |
| Geolocation permission denied → dead end | User leaves | Search + popular-city shortcuts always available; clear "location blocked" message (PRD §14 states) |
| Error card that says only "Something went wrong" | No path forward, no trust | "Can't assess right now" + what failed + Retry; sections degrade independently |

## "Looks Done But Isn't" Checklist

- [ ] **Verdict matrix:** All 12 category×profile cells implemented — verify boundary unit tests cover 30/60/90/120/250 on *both* profiles; "Moderate + Sensitive = Take care" is the commonly skipped cell.
- [ ] **Fail-soft:** Verify by *breaking* an upstream (blackhole URL), not by reading code — the response must return 200 with that section `unavailable`, and the UI must render the partial state, not a spinner.
- [ ] **Timezone:** Run the smoke script with `TZ=UTC` and diff against `TZ=Asia/Kolkata` output — identical results required. A chart "now" marker check with a non-IST system clock.
- [ ] **CORS:** `curl` shows exactly ONE `access-control-allow-origin` on a GET and a 200/204 OPTIONS from the *deployed* URL — browser DevTools alone can't distinguish double-header from missing-header cleanly.
- [ ] **Deep link in a signed-out private window** on the production Amplify URL — not just localhost.
- [ ] **Share card on a real iPhone over mobile data:** PNG non-blank, fonts rendered, timestamp present, download fallback works, `canShare` false-path exercised on desktop Safari/Firefox.
- [ ] **Accessibility:** Greyscale test of the verdict screenshot (icon+word distinguishable), keyboard-only path through search → verdict → chart points → tips, `aria-live` fires on toggle.
- [ ] **No mock data in the product bundle:** `grep` fixtures out of `apps/` (fixtures belong in tests and the smoke script only) — the "no mock data ever" constraint is a judging differentiator.
- [ ] **Secrets:** built `dist/` and repo history contain no `OPENAQ_API_KEY`/`FIRMS_MAP_KEY`.
- [ ] **Video:** plays signed-out at ≤3:00, ≥720p, shows live CloudWatch lines, URL shown in video opens successfully.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Timezone bug found late (post-chart) | MEDIUM | Fix parsing in `@breeze/core` only (single implementation thanks to ADR-0001); UI and share card inherit the fix; re-run smoke across 12 places |
| CORS duplicate-header on deploy day | LOW | Remove Hono `cors()` from the production path (or disable URL CORS) — one-line-class change + redeploy API; verify with curl |
| iOS blank share card | MEDIUM | Ship double-capture loop + font-ready await; if still failing, flip default share to download + copy-link (feature degrades, demo survives) |
| Upstream outage during demo/video | LOW–MEDIUM | Per-section fail-soft shows partial verdict honestly (this *is* the story — PRD beat 3); re-record slot Sunday midday; model-estimate path still live via Open-Meteo |
| Amplify blank page from rewrite | LOW | Switch to `404-200` target `/index.html`; rules are console-editable in a minute — no rebuild |
| Budget alert / rate limit on final day | LOW | Reserved concurrency already caps throughput; demo against the video (artifact of record); reduce smoke-script frequency |
| Missed Sat 6 PM public-URL cut | — (by design) | Execute the cut: drop P1/P2, ship P0 URL; scope discipline is the recovery |

## Pitfall-to-Phase Mapping

Phases refer to the PRD §18 delivery-plan slots (the roadmap should give each a named phase).

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Wall-clock timezone parsing | Core logic + unit tests (Fri eve/Sat morning) | `TZ`-diff smoke run; day-boundary unit tests |
| 2. CPCB naming/boundary math | Core logic + unit tests | Boundary tests + CPCB-calculator golden values; copy audit |
| 3. CORS double-config | SAM deploy (Sat afternoon) | curl single-ACAO + OPTIONS check from deployed URL |
| 4. TanStack defaults | Web P0 wiring (Sat midday) | Zero-refetch-on-toggle test; ≤1 retry observed on failure; CloudWatch invocation counts |
| 5. Lambda cache/timeout semantics | API assess route (Sat morning) | Blackhole-upstream fail-soft test; `Task timed out` absent |
| 6. iOS share capture | P1 share card (Sun AM) | Real-iPhone QA matrix row; desktop fallback check |
| 7. Amplify rewrite | SAM + Amplify deploy (Sat afternoon) | Signed-out deep-link load; bad-asset 404 check |
| 8. WCAG AA verdict colours | Tokens early + a11y pass (Sat evening) | Contrast ratios recorded per token pair; greyscale test; keyboard path |
| 9. OpenAQ geospatial/units | Friday-evening day-one verification | Raw-response printout for 5 place types; units assertion in smoke script |
| 10. Submission mechanics | Submission phase (Sun midday) | Full §18 checklist executed hours before deadline |

## Sources

- AWS Lambda docs — Function URL CORS configuration & duplicate-header behavior; execution-environment lifecycle (Firecracker isolation, reuse-not-guaranteed, cold-start <1% steady-state) — docs.aws.amazon.com (HIGH — official)
- AWS Amplify Hosting docs — redirects/rewrites, SPA regex rule, troubleshooting (baseDirectory, rule order) + aws-amplify/amplify-hosting issues #2524, #3546 (HIGH — official + maintainer replies)
- CPCB — "National Air Quality Index" final report + "How is AQI Calculated?" (app.cpcbccr.com): breakpoints, 24-h averaging, truncation, interpolation formula (HIGH — primary source)
- Open-Meteo docs + issues #488, #1333, #1545, #1764 (maintainer-confirmed time/DST semantics) (HIGH — official + tracker)
- OpenAQ v3 docs, Python SDK geospatial guide, openaq-api issue #388 (500 on invalid bbox) (HIGH — official + tracker)
- bubkoo/html-to-image issue #488, PR #585, dom-to-image #27; MDN CORS-enabled-canvas guide (HIGH — community-verified + MDN)
- TanStack Query official docs (Important Defaults, Retries, Polling) + TkDodo/community write-ups on error-staleness (HIGH — official)
- Devpost judging guide, MLH standard rules, ETHGlobal/Devfolio submission rules, Colosseum submission workshop (MEDIUM — community/organizer guidance, varies per event; event-specific rules re-checked against WeMakeDevs page before submission)
- Internal: PRD.md §7–§19, ADR-0001/0002, PROJECT.md key decisions (HIGH — project spec)

---
*Pitfalls research for: Breeze (live air-quality verdict SPA + Hono/Lambda API, hackathon submission)*
*Researched: 2026-10-11*
