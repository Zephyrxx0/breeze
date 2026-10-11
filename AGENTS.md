<!-- GSD:project-start source:PROJECT.md -->

## Project

**Breeze**

Breeze answers one question for any resident or visitor in India: **is the air outside OK for me right now, and what should I do about it?** A user searches for a place or taps *Use my location*; Breeze returns one plain-language verdict (*Good to go* / *Take care* / *Stay indoors if you can*) with reasons, the current PM2.5 labelled honestly as a station reading or a regional model estimate, a 48-hour forecast with the cleanest 3-hour window, a short rule-driven tip checklist, and a shareable card. There are no accounts, no database and no mock data — every number is a live API call that carries a timestamp and is hidden rather than invented when its source fails.

**Core Value:** One honest, actionable verdict per place — visible within 3 seconds, always naming its data source and confidence. If everything else fails, a person in India must still be able to see the verdict and know why.

### Constraints

- **Timeline:** ~48 hours (Fri 9 Oct evening → Sun 11 Oct afternoon). Hard cut rule: no public URL by Sat 6 PM ⇒ drop P1 and P2 entirely.
- **Tech stack:** React + TypeScript (Vite), Tailwind, TanStack Query, Hono on Node.js 22 (Lambda arm64), zod, AWS SAM + Amplify Hosting. Chosen for speed, free-tier fit, and one shared core package. (PRD §10)
- **Performance:** verdict visible < 3 s warm on 4G; API p95 ≤ 2.5 s warm / 5 s cold; initial JS < 200 KB gzipped; Lighthouse mobile ≥ 90.
- **Data honesty:** 100% live data; no fixtures or mock data in the product; every number carries source + timestamp; missing data is shown as missing (fail soft, never fake).
- **Privacy/security:** no accounts or analytics; coordinates rounded to 2 dp; logs at 1 dp; keys only in Lambda env; CORS allow-list; budget alert ~USD 5.
- **Budget:** free-tier-friendly only (Lambda Function URL, Amplify static hosting, key-free upstreams where possible).

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Recommended Stack

### Core Technologies (pin these exact versions — verified 2026-10-11 via npm registry)

| Technology | Version | Purpose | Why (current-status note) |
|------------|---------|---------|---------------------------|
| React + react-dom | 19.3.0 | SPA UI | Current stable. Hooks-based; works with TanStack Query v5. |
| Vite | 8.3.4 | Build/dev server | Current major (v8). Static output Amplify serves directly. Requires Node ≥ 20.19/22.12 (fine on Node 24). |
| @vitejs/plugin-react | 6.1.2 | React integration for Vite 8 | Version-matched to Vite 8. |
| Tailwind CSS + @tailwindcss/vite | 4.3.3 | Styling | v4 is current. **CSS-first config**: design tokens go in `src/styles/tokens.css` via `@theme {}` — no `tailwind.config.js`, no PostCSS config. Perfect fit for PRD's tokens plan. |
| @tanstack/react-query | 5.104.1 | Data fetching/caching | Current v5. Retries, dedup and stale handling are load-bearing for the fail-soft UX (PRD §10). React 19 supported. |
| Hono | 4.13.13 | API framework | Current v4. Web-standards, tiny, runs on Lambda and local Node with one codebase. |
| @hono/aws-lambda | 1.0.1 | Lambda adapter | **Required over `hono/aws-lambda`** — see quirk below. |
| @hono/node-server | 2.1.4 | Local dev server | `src/dev.ts` local dev for the Hono app. |
| zod | 4.6.5 | Validation | Current v4 (faster, JSON-Schema interop). Query params + upstream response parsing (PRD §10). |
| TypeScript | 5.9.3 | Language | npm latest is 7.0.2 (native port), but 5.9.x has the smoothest tooling path for a 48h build; esbuild/SAM never typecheck anyway. |
| Vitest | 5.0.3 | Unit tests | Current. `@breeze/core` boundary tests (PRD §17). |
| AWS Lambda runtime | nodejs24.x, arm64 | Compute | Node 24 is GA on Lambda and active LTS (patches to ~Apr 2028); nodejs22.x EOLs Apr 2027. PRD §10 explicitly allows "any newer Lambda-supported runtime". |
| AWS SAM CLI | 1.168.0 | Deploy tooling | Current (PyPI). Install via `pip`/`brew` — **the `aws-sam-cli` npm package (0.28.2) is not the real CLI.** |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @fontsource-variable/inter (or @fontsource/inter) | 5.3.0 | Self-hosted fonts | Share-card canvas capture + no FOUT (PRD §10). |
| html-to-image | 1.11.13 | Share card PNG (P1) | Client-side 1080×1350 capture; no server cost. |
| qrcode | 1.5.4 | Deep-link QR (optional) | Only if the share card shows a QR. |
| esbuild | (bundled with SAM) | Lambda bundling | SAM `Metadata: BuildMethod: esbuild` — no separate bundler needed. |

### Upstream Data-Source Contracts (verified against first-party docs, 2026-10-11)

#### 1. Open-Meteo Air Quality (CAMS) — `air-quality-api.open-meteo.com/v1/air-quality`

- **`current=pm2_5` works.** Every hourly variable is available as a current condition (current values are derived from 15-minutely model data). Response shape: `current: { time, pm2_5, interval }`. Confidence: HIGH.
- `hourly=pm2_5,pm10` — instantaneous µg/m³ at 10 m above ground. Confidence: HIGH.
- `forecast_days` valid range **0–7** (default 5) on the Air Quality API — PRD's `2` is fine. Confidence: HIGH.
- `domains`: `auto` (default) combines CAMS Europe + CAMS Global. For India, `auto` resolves to **CAMS Global 0.4° (~45 km), 3-hourly, updated every 12 h, 5 days of forecast** — PRD §8's "data reality" claims are exactly right. You may pin `domains=cams_global` explicitly to avoid Europe-domain ambiguity. Confidence: HIGH.
- **Time quirk (load-bearing for @breeze/core):** with `timezone=auto`, `hourly.time[]` entries are location-local **wall-clock strings without an offset** (e.g. `"2026-10-11T15:00"`), and `utc_offset_seconds` is fixed at request time; DST transitions inside the range are ignored (irrelevant for India, IST is +05:30 year-round). Never `new Date("2026-10-11T15:00")` in a browser in another tz — treat as local wall clock, or send `timeformat=unixtime` and format with `utc_offset_seconds`. Confidence: HIGH.
- **Grid quirk:** returned `latitude`/`longitude` is the grid-cell centre and can be a few km from the request point — expected at 45 km resolution; never present it as "your exact coordinates". Confidence: HIGH.
- Errors: HTTP 400 with `{ "error": true, "reason": "..." }` on bad params — zod-parse and surface as `unavailable`, never crash. Confidence: HIGH.
- **Rate limits (free tier):** 600 calls/min, 5,000/hour, 10,000/day, 300,000/month. A "call" is fractional: requests with >10 variables or >2 weeks of data cost multiple calls — Breeze's request (7 vars, 2 days) costs exactly 1.0. Non-commercial only; commercial use needs `customer-api.open-meteo.com` + `apikey`. CC BY 4.0 attribution to **CAMS + Open-Meteo is mandatory** (footer/about sheet). Confidence: HIGH.

#### 2. Open-Meteo Forecast — `api.open-meteo.com/v1/forecast`

- All seven hourly vars exist; `daily=uv_index_max,sunrise,sunset` all exist (sunrise/sunset return ISO 8601 local strings with offset, e.g. `"2026-10-11T06:29"` when `timezone=auto`). `precipitation_probability` is a preceding-hour probability from ~27 km ensemble models. Confidence: HIGH.
- `daily` variables **require** `timezone` to be set — PRD already sends `timezone=auto`; do not drop it. Confidence: HIGH.
- `forecast_days` range 0–16 (default 7). Same wall-clock time quirk as the Air Quality API. `current=` also supported if you want a one-call weather strip. Confidence: HIGH.
- Same free-tier limits and fractional-call rule as above (non-commercial, 10k/day). Confidence: HIGH.

#### 3. Open-Meteo Geocoding — `geocoding-api.open-meteo.com/v1/search`

- `countryCode` **is a real ISO-3166-1 alpha2 filter param** — but still defensively filter `results[].country_code === "IN"`: the filter has historically been soft, and saved places/deep links bypass search anyway. `count` default 10, max 100. Confidence: HIGH.
- Response: `{ results: [...] }` — each result has `id, name, latitude, longitude, elevation, feature_code, country_code, admin1..admin4, population, timezone`; **empty fields are omitted** and `results` itself is **omitted entirely when nothing matches** — zod-parse with a default of `[]`. Confidence: HIGH.
- Client-side call is fine (no key). Same non-commercial/attribution terms. Confidence: HIGH.

#### 4. OpenAQ v3 — `api.openaq.org/v3` (the riskiest source — verified in full)

- **Auth:** free API key in `X-API-Key` header, signup at explore.openaq.org. Keys live only in Lambda env (PRD §12). Confidence: HIGH.
- **bbox parameter order — PRD's guess is CONFIRMED CORRECT:** `bbox` takes **minLon, minLat, maxLon, maxLat** = west,south,east,north (WGS84). Example from official docs: `?bbox=-118.668153,33.703935,-118.155358,34.337306&limit=1000`. Out-of-range coords → HTTP 422. Confidence: HIGH.
- **Do NOT use `coordinates`+`radius`:** the official docs contradict themselves on its order (the geospatial guide says lat,lon; the examples page shows lon,lat for the same point). `bbox` is unambiguous. Exactly the hazard PRD §8 flagged. Confidence: HIGH.
- **Locations search:** `GET /v3/locations?bbox=…&parameters_id=2&limit=1000` — `parameters_id=2` filters to PM2.5 stations (id 2 = `pm25`, µg/m³, confirmed in official payloads). Locations are sorted by relevance; `bbox` returns `distance: null`, so **compute distance yourself with haversine** (`@breeze/core`) — you already planned to. Confidence: HIGH.
- **Sensor→parameter mapping:** each location record embeds `sensors: [{ id, name, parameter: { id, name, units, displayName } }]`. That embedded list *is* the mapping — no extra call needed. Confidence: HIGH.
- **Latest-value flow:** `GET /v3/locations/{locations_id}/latest` returns one row per sensor: `{ datetime: { utc, local }, value, coordinates, sensorsId, locationsId }`. Pick the row whose `sensorsId` matches the sensor whose `parameter.id === 2`. Do **not** assume `value` units without checking `parameter.units` (PM2.5 is µg/m³, but other parameters vary). Confidence: HIGH.
- **"Latest" quirk (matters for the stale badge):** OpenAQ explicitly documents that *latest = last value in the time series, not necessarily the most recently ingested*; providers report out of order. So `datetime.utc` can be hours old even on a 200 OK — always show `measuredAt` age and apply PRD §7.3's freshness rules; never treat a 200 as "fresh". Confidence: HIGH.
- **Rate limits (free key):** **60 requests/minute, 2,000/hour**; HTTP 429 on exceed; response carries `x-ratelimit-limit/remaining/used/reset` headers; repeated abuse = temporary/permanent ban. With the 15-min TTL cache and one station+latest pair per place, Breeze stays orders of magnitude under. Note: the `latest` call is **per location** — one bbox search + one `/latest` per place = 2 requests per cache miss. Confidence: HIGH.
- Pagination: `limit` max 1,000/page, `meta.found` for totals — for a city bbox you'll rarely page, but cap to nearest-N (e.g. 10) after client-side distance sort instead of paging. Confidence: HIGH.

#### 5. NASA FIRMS (P2) — `firms.modaps.eosdis.nasa.gov/api/area`

- **Coordinates are west,south,east,north** (or the literal `world`) — same order as your India box. Confidence: HIGH.
- **DAY_RANGE max is 5** (valid 1–5), not larger: no date ⇒ most recent data, from today back `DAY_RANGE` days; with a date ⇒ `DATE .. DATE+DAY_RANGE-1`. PRD's `/2` is valid. Confidence: HIGH.
- **MAP_KEY limits: 5,000 transactions per 10-minute window**, and *larger day ranges count as multiple transactions*. A status endpoint exists to check remaining transactions. At 1 call / 60-min TTL this is irrelevant — but never loop FIRMS. Confidence: HIGH.
- Sources: `VIIRS_SNPP_NRT` and `VIIRS_NOAA20_NRT` both valid; `VIIRS_NOAA21_NRT` now also exists (could double detections if you query two VIIRS sources — query one, or dedupe by acq time+pixel). Confidence: HIGH.
- CSV columns for VIIRS include `latitude, longitude, bright_ti4, scan, track, acq_date, acq_time, satellite, confidence, version, bright_ti5, daynight, frp, type` — matches PRD's `detections[]` shape (`confidence` is a categorical `low|nominal|high` string; `frp` numeric). CSV parse with a tiny hand-rolled parser (no header quoting complexity) or zod + split. Confidence: MEDIUM (column list from knowledge; verify in the smoke script — first row parse is the day-one check).
- MAP_KEY free from the FIRMS site; keep in Lambda env only. Confidence: HIGH.

#### 6. BigDataCloud reverse geocode — `api.bigdatacloud.net/data/reverse-geocode-client`

- **Live-tested today** (New Delhi coords): HTTP 200, **no API key**, response: `{ latitude, longitude, countryName, countryCode, principalSubdivision, city, locality, plusCode, localityInfo: { administrative: [...], informative: [...] } }`. Label fallback chain: `city || locality || principalSubdivision || "Your location"`. Confidence: HIGH on shape (live), MEDIUM on terms.
- Terms: BigDataCloud markets the *client-side* reverse-geocode as free, no key/account, privacy-first, and claims "no rate limit" for it — but there is **no hard SLA or documented quota**. Treat as best-effort: fail soft to "Your location" (PRD §8 row 6 already plans this). Confidence: MEDIUM.

## Installation

# Web app (apps/web)

# API (apps/api)

# Shared (packages/core) + tests

# Optional P1 extras

# SAM CLI — pip/brew, NOT npm

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| @hono/aws-lambda `handle` (Function URL, payload 2.0) | API Gateway HTTP API | Only if you later need per-route auth/rate-shaping; Function URL is cheaper and simpler for one public GET. |
| nodejs24.x arm64 | nodejs22.x arm64 | Only if SAM tooling in your environment can't target 24 — 22 remains fully supported until Apr 2027. |
| OpenAQ `/locations?bbox` + `/locations/{id}/latest` | `/parameters/2/latest` (global latest, then filter) | Never for Breeze: the global latest endpoint returns the whole planet; bbox-first is 2 calls vs thousands. |
| BigDataCloud client-side | Open-Meteo Geocoding reverse (`latitude,longitude` on `/v1/search`?) — no official reverse endpoint | BigDataCloud is the only keyless reverse option found; if it degrades, fall back to "Your location" per PRD. |
| Hand-written SVG chart (PRD §10) | Recharts/Chart.js | Keep hand-written — bundle budget (<200 KB gz) rules out chart libs for one 48-hour chart. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `import { handle } from "hono/aws-lambda"` | Deprecated subpath; **will be removed in Hono v5** (adapters moved to standalone packages in 4.13.10). | `import { handle } from "@hono/aws-lambda"` (npm `@hono/aws-lambda@1.0.1`) |
| `aws-sam-cli` from npm | Not the AWS CLI — the npm package is unrelated/stale (0.28.2). | `pip install aws-sam-cli` / `brew install aws-sam-cli` |
| OpenAQ `coordinates`+`radius` params | Official docs give contradictory orderings for `coordinates` (lat,lon vs lon,lat). | `bbox` (west,south,east,north) — unambiguous |
| `new Date(openMeteoTime)` in browser code | Open-Meteo iso8601 strings are location-local wall clock without offset; parsing in a user's browser tz corrupts day boundaries. | Wall-clock string handling or `timeformat=unixtime` + `utc_offset_seconds` |
| Node 18/20 Lambda runtimes | Deprecated/EOL on Lambda. | nodejs24.x (or 22.x) |
| Tailwind `tailwind.config.js` + PostCSS setup | v4 is CSS-first; the legacy setup invites version skew with `@tailwindcss/vite`. | `@import "tailwindcss"` + `@theme {}` in `tokens.css` |
| Any client-side "fallback mock" for failed upstreams | Violates the data-honesty constraint (no mock data ever). | Per-section `unavailable` status + Retry (already the design) |

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| vite@8.3.4 | @vitejs/plugin-react@6.1.2, tailwindcss/@tailwindcss/vite@4.3.3 | Vite 8 requires Node ≥ 20.19 / 22.12 — dev on Node 24 to match Lambda. |
| react@19.3.0 | @tanstack/react-query@5.104.1 | v5 supports React 19; no legacy `ReactDOM.render` assumptions. |
| hono@4.13.13 | @hono/aws-lambda@1.0.1, @hono/node-server@2.1.4 | Adapters are versioned independently since 4.13.10; keep them as separate deps. |
| typescript@5.9.3 | vitest@5.0.3, esbuild (SAM) | TS 7.0.2 (native) exists but is unnecessary risk mid-hackathon. |
| SAM esbuild bundling | nodejs24.x arm64 | Set `Metadata: BuildMethod: esbuild`, `Minify: true`, `Target: es2023`, `Format: esm` + `Main: src/lambda.ts` (or cjs if you need `__dirname`). |

## Day-one verification still open (PRD §8 items not resolvable from docs)

## Sources

- [docs.openaq.org/geospatial](https://docs.openaq.org/using-the-api/geospatial), [/resources/locations](https://docs.openaq.org/resources/locations), [/resources/latest](https://docs.openaq.org/resources/latest), [/examples](https://docs.openaq.org/examples/examples), [/rate-limits](https://docs.openaq.org/using-the-api/rate-limits) — bbox order, sensors mapping, latest flow, 60/min + 2000/hr limits (fetched directly; HIGH)
- [firms.modaps.eosdis.nasa.gov/api/area](https://firms.modaps.eosdis.nasa.gov/api/area/) — area CSV contract, DAY_RANGE 1–5, 5000 tx/10-min MAP_KEY limit (fetched directly; HIGH)
- [open-meteo.com/en/docs/air-quality-api](https://open-meteo.com/en/docs/air-quality-api), [/en/docs](https://open-meteo.com/en/docs), [/en/docs/geocoding-api](https://open-meteo.com/en/docs/geocoding-api), [/en/pricing](https://open-meteo.com/en/pricing) — `current` support, forecast_days ranges, CAMS Global 45 km/3-hourly/12 h cadence, free-tier limits, timeformat quirk (fetched directly; HIGH)
- [api.bigdatacloud.net/data/reverse-geocode-client](https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=28.61&longitude=77.21&localityLanguage=en) — live contract test 2026-10-11 (HIGH); bigdatacloud.com free-api pages for terms (MEDIUM)
- [hono.dev/docs/getting-started/aws-lambda](https://hono.dev/docs/getting-started/aws-lambda) + Context7 `/honojs/hono` — @hono/aws-lambda migration, Function URL 2.0 support, v4.13.13 (HIGH)
- npm registry queries 2026-10-11 — exact versions for react, vite, tailwindcss, @tanstack/react-query, hono, zod, vitest, html-to-image, qrcode, @fontsource (HIGH)
- AWS Compute blog + Lambda runtimes docs (via search snippets) — nodejs24.x GA, nodejs22.x EOL Apr 2027 (MEDIUM)
- PyPI `aws-sam-cli` JSON — SAM CLI 1.168.0 (HIGH)

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
