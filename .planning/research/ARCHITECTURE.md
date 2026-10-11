# Architecture Research

**Domain:** Serverless air-quality decision SPA (greenfield, 48-hour hackathon build)
**Researched:** 2026-10-11
**Confidence:** MEDIUM (all findings cross-checked via ≥2 independent sources; the classify seam caps scraped/web sources at MEDIUM — the SAM-workspace finding is triple-corroborated)

**Scope note:** The architecture itself is *fixed* by PRD §9 and ADR-0001/0002 (React SPA on Amplify; Hono Lambda behind a Function URL; shared pure-TS `@breeze/core` computing verdicts client-side; no DB; in-memory TTL cache; SAM deploys). This research does **not** re-litigate those decisions. It validates the monorepo shape, local-dev ergonomics, deploy flow, CORS edge cases, and the build order that fall out of them.

## Standard Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│ Browser (React SPA — apps/web, hosted on Amplify)                      │
│  ┌──────────────┐  ┌───────────────────────┐  ┌─────────────────────┐  │
│  │ SearchBox /  │  │ @breeze/core (in-bundle)│  │ TanStack Query cache│  │
│  │ GPS + URL    │  │ verdict · window · tips │  │ (memory only)       │  │
│  │ state router │  │ sensitivity recompute   │  └─────────────────────┘  │
│  └──────┬───────┘  └───────────▲────────────┘                            │
│         │ (1) geocode/reverse  │ (3) computes from AssessResponse        │
└─────────┼──────────────────────┼─────────────────────────────────────────┘
          │ direct, keyless      │
          ▼                      │
   Open-Meteo Geocoding,         │
   BigDataCloud                  │
          │                      │
          │ (2) GET /api/assess?lat&lon   (cross-origin, CORS = Function URL config)
          ▼                      │
┌────────────────────────────────┴────────────────────────────────────────┐
│ AWS Lambda arm64 — Function URL — apps/api (Hono via @hono/aws-lambda)  │
│  ┌──────────────┐   ┌──────────────────┐   ┌─────────────────────────┐  │
│  │ route:assess │──▶│ 4 API clients    │──▶│ Open-Meteo AQ (CAMS)    │  │
│  │ validate →   │   │ zod + 4s timeout │   │ Open-Meteo Forecast     │  │
│  │ cache check  │   │ per-section      │   │ OpenAQ v3 (key in env)  │  │
│  │      │       │   │ fail-soft        │   │ NASA FIRMS (P2, key)    │  │
│  │ cache.ts TTL │   └──────────────────┘   └─────────────────────────┘  │
│  └──────┬───────┘  (uses @breeze/core geo/selection helpers only)       │
│         │ normalise → ONE AssessResponse — NO verdict logic server-side │
│  CloudWatch Logs (structured JSON, one line per request)                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With | Implementation |
|-----------|----------------|-------------------|----------------|
| `apps/web` SPA | Place selection (search/GPS/deep link/saved chips), rendering, a11y | `@breeze/core` (import), `/api/assess` (HTTP), Geocoding/BigDataCloud (direct) | Vite + React + Tailwind + TanStack Query |
| `@breeze/core` | All decision logic: `categoryFor`, `subIndex`, `verdictFor`, `selectEffectivePm25`, `bestWindow`, `buildTips`, `haversineKm`/`bearingDeg`; shared types + config constants | Nothing (pure, zero I/O, zero runtime deps) — imported by both apps | Pure TypeScript, **no build step**: `exports` → `src/index.ts` |
| `apps/web` data layer | URL ↔ place state (ADR-0002), localStorage profile/saved places, query keys | SPA components | `src/lib/api.ts`, `geo.ts`, `storage.ts` |
| `apps/api` route `assess` | Input validation (zod, India bbox), cache lookup, orchestrate upstreams in parallel, normalise to `AssessResponse` | 4 clients, `cache.ts`, `@breeze/core` (geo + station-selection helpers only) | Hono app |
| `apps/api` clients | One upstream each; 4 s `AbortController` timeout; zod-parse; return normalised object or typed failure | Open-Meteo / OpenAQ / FIRMS | Native fetch |
| `apps/api` cache | In-memory TTL map keyed `lat,lon (2 dp) + source`; stale-while-error ≤ 3 h | process memory only (disposable) | `cache.ts` |
| `apps/api` adapters | `lambda.ts` (`@hono/aws-lambda` `handle(app)`) / `dev.ts` (Node server) | Hono app | Thin entrypoints |
| Deploy | SAM → Lambda+Function URL; Amplify → SPA; both git-connected to one public GitHub repo | — | `template.yaml`, root `amplify.yml` |

**Hard boundary rules (validated by ADR-0001/0002):**
- No verdict/tip/window logic in `apps/api` — it normalises data only. (Server-side verdict would break FR-09's instant Sensitive toggle and create a second implementation to test.)
- No AQ/weather fetches from the browser — they must pass through `/api/assess` (keys, caching, normalisation, 4 s timeouts in one place).
- `@breeze/core` never imports from `apps/*` and performs no I/O — it is the only shared edge.
- Nothing writes to a server; state is URL + localStorage.

## Recommended Project Structure

```
breeze/
  package.json              # workspaces: ["apps/*", "packages/*"]; root scripts
  tsconfig.base.json        # module: ESNext, moduleResolution: Bundler, strict
  amplify.yml               # monorepo build spec at repo ROOT (overrides console)
  apps/
    web/
      package.json          # deps: react, @tanstack/react-query, tailwind, @breeze/core ("*")
      tsconfig.json         # extends ../../tsconfig.base.json
      vite.config.ts        # server.proxy['/api'] → http://localhost:8787 in dev
      src/{components,lib,styles}/…
    api/
      package.json          # deps: hono, @hono/aws-lambda, zod, @breeze/core ("*")
      tsconfig.json
      template.yaml         # SAM: FunctionUrlConfig.Cors, esbuild BuildMethod
      src/{app.ts,lambda.ts,dev.ts,routes/,clients/,cache.ts}
  packages/
    core/
      package.json          # "exports": { ".": "./src/index.ts" } — NO build output
      src/{category.ts,verdict.ts,window.ts,tips.ts,geo.ts,config.ts,types.ts}
      *.test.ts             # Vitest, boundary tests per PRD §17
  scripts/smoke-live.ts
```

### Structure Rationale

- **npm workspaces (`apps/*`, `packages/*`):** PRD §10 already fixes this; Amplify auto-detects npm workspaces (official docs) and SAM handles it *if* built in-source (see Pitfalls). No Nx/Turbo — overhead with zero payoff at 3 packages.
- **`@breeze/core` is no-build:** `exports` points straight at `src/index.ts`. Vite compiles TS workspace source natively; SAM's esbuild `BuildMethod` also compiles TS. This removes the entire "build core before web/api" ordering constraint from the 48-hour loop — any change to core is picked up by both consumers on next bundling with no `dist` staleness.
- **Real workspace dependency, not tsconfig path aliases:** path aliases are compile-time-only and are the #1 cause of "works in Vite, breaks in SAM esbuild" (aliases don't exist in the temp build dir). `"@breeze/core": "*"` in each consumer's `package.json` makes the link real for both bundlers.
- **`tsconfig.base.json` + `moduleResolution: Bundler`:** bundlers do transpilation; `tsc --noEmit` does type checking (Nx-documented consensus). TypeScript project references are the "proper" scalable solution but are overkill for a 3-package solo build — skip them.
- **`template.yaml` lives in `apps/api`:** PRD §13; `sam build` runs there with `CodeUri: .`.

## Architectural Patterns

### Pattern 1: Backend-for-Frontend single endpoint + client-side shared core

**What:** One `GET /api/assess` hides four upstreams and returns normalised `AssessResponse`; the browser runs `@breeze/core` to derive verdict/window/tips.
**When:** Whenever the compute is deterministic, cheap, and needs to re-run on client-only state (here: the Sensitive profile).
**Trade-offs:** (+) instant toggle, one tested implementation, tiny API surface, keys stay server-side. (−) logic fixes require a front-end redeploy (Amplify rebuild — minutes, fine here); core logic ships in the client bundle (~small, pure functions).

```ts
// apps/api/src/routes/assess.ts — server normalises, never decides
const [air, weather] = await Promise.all([
  fetchAir(validated),   // station + model + comparison
  fetchWeather(validated),
]);
return c.json(buildAssessResponse(air, weather), 200, {
  'Cache-Control': 'public, max-age=300',
});
```

### Pattern 2: In-memory TTL cache with stale-while-error

**What:** Module-level `Map` keyed `lat2dp,lon2dp|source` → `{ data, fetchedAt }`; fresh entries serve directly, failed upstreams fall back to entries ≤ 3 h old marked `stale` with `ageMin`.
**When:** stateless serverless with repeat traffic over hot coordinates; no DB allowed (ADR-0002).
**Trade-offs:** (+) zero cost, zero infra. (−) per-instance — every cold start starts empty (acceptable: fail-soft is per-section, upstreams are the source of truth). Do **not** add Docker/Redis/ElastiCache — out of budget and scope.

```ts
// apps/api/src/cache.ts
const store = new Map<string, { data: unknown; fetchedAt: number }>();
export function cacheGet<T>(key: string, ttlMs: number, maxAgeMs: number):
  | { kind: 'fresh'; data: T } | { kind: 'stale'; data: T; ageMin: number } | null { … }
```

### Pattern 3: URL-as-state router (ADR-0002)

**What:** `/?lat=..&lon=..&n=..` is the single navigation state; every place change is a history push; on load the URL is parsed first and drives the one `/api/assess` call. Saved places and deep links are just navigations to this URL.
**When:** shareable-by-construction links, no accounts.
**Trade-offs:** (+) share/deep-link/saved-chips all collapse into one mechanism; React state stays trivial. (−) label `n` in the URL is display-only and must be decoded; 2-dp rounding is the identity.

### Pattern 4: Dev loop — Vite proxy, same-origin, no CORS locally

**What:** `vite.config.ts` proxies `/api` → `http://localhost:8787` where `src/dev.ts` (Hono's Node `serve`) runs the *identical* `app.ts`. Root script runs both (`concurrently` or two `&`s). Because the browser only ever talks to `:5173` in dev, **dev requires zero CORS configuration**.
**Trade-offs:** (+) prod CORS problems never surface as dev friction; HMR on web while editing core. (−) dev doesn't exercise the Lambda adapter — acceptable; `sam local start-api` exists but needs Docker and is explicitly optional (PRD §13) — **keep it out of the critical path**.

```ts
// apps/web/vite.config.ts
server: { proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } } }
// no rewrite needed: routes are literally /api/assess, /api/health
```

### Pattern 5: Lambda adapter as a one-line entrypoint

**What:** `apps/api/src/lambda.ts` is only `import { handle } from '@hono/aws-lambda'; export const handler = handle(app);`.
**Verified (Context7, official Hono docs):** the old `hono/aws-lambda` import is **deprecated for v5** — use the standalone **`@hono/aws-lambda`** package. Works on Node 18+, so Node 22 arm64 is fine, and handles Function URL events natively.

### Pattern 6: CORS configured at exactly ONE layer — the Function URL

**What:** `FunctionUrlConfig.Cors` in `template.yaml` is the single source of CORS truth in prod (`AllowOrigins: [!Ref AllowedOrigin, 'http://localhost:5173']`, `AllowMethods: [GET]`). The Hono app adds **no** `cors()` middleware in the Lambda path.
**Why:** the Lambda front end injects `Access-Control-*` headers from the Function URL config; if the function *also* returns them (Hono `cors()`), the browser receives duplicated headers and rejects the response — this is the classic "CORS configured correctly but still failing" Function URL bug (SO Q76944724, r/aws threads, AWS CORS docs, corroborated by 4 sources). Note a plain `GET /api/assess` with no custom headers is a CORS *simple request* — no preflight — but the response still needs the allow-origin header, and origin matching is exact (no wildcard subdomains).
**Optional refinement:** if you want `cors()` for local `dev.ts` parity, register it in `dev.ts`/middleware chain only — never in the code path behind the Function URL.

### Pattern 7: Deploy pipeline — Amplify git-connected, SAM manual

**What:** two independent deploy paths, no CI service needed at hackathon speed:
1. **SAM (API):** `cd apps/api && sam build --build-in-source && sam deploy --guided` from the laptop → note `ApiUrl` output (the Function URL). CloudWatch logs appear automatically.
2. **Amplify (SPA):** connect the public GitHub repo once; a **root `amplify.yml`** with monorepo syntax drives every push to `main`:

```yaml
version: 1
applications:
  - appRoot: apps/web
    frontend:
      buildPath: /            # install at monorepo root so workspaces link
      phases:
        preBuild: { commands: [ 'npm ci' ] }
        build:    { commands: [ 'npm run build --workspace apps/web' ] }
      artifacts:
        files: ['**/*']
        baseDirectory: apps/web/dist
      cache: { paths: ['node_modules/**', '~/.npm/**'] }
```
   Plus `AMPLIFY_MONOREPO_APP_ROOT=apps/web` env var (must equal `appRoot`; it drives SPA redirect behavior for sub-apps), and `VITE_API_BASE_URL=<Function URL>` in the same env screen (official Amplify monorepo docs).
3. **Bootstrap ordering (chicken-and-egg):** `AllowedOrigin` needs the Amplify domain, the Amplify build needs the Function URL. Cheapest sequence: connect Amplify first (build succeeds even if the API 404s) → read the branch domain (`https://<branch>-<hash>.app.amplifyapp.com`) → do the **first** SAM deploy with the full allow-list already correct → no second API redeploy. (PRD §13's step 4 redeploy works too, but this saves a deploy cycle.)
4. **Keys:** `OpenAqApiKey` as a SAM `NoEcho` parameter; nothing secret ever in Amplify env or the repo (`VITE_*` vars are baked into the public bundle).

## Data Flow

### Request flow (core path — must be < 3 s warm)

```
User picks place (search tap / GPS / deep link / saved chip)
  → web writes URL (?lat&lon&n)  [round coords to 2 dp]
  → TanStack Query GET {VITE_API_BASE_URL}/api/assess?lat&lon
  → Lambda: zod validate → India bbox → cache lookup (key: lat2,lon2 + source)
      ├─ cache fresh → return (log: cache_hit)
      └─ miss → Promise.all 4 clients (zod parse, 4 s AbortController each)
           ├─ per-source success → normalise
           └─ per-source failure → status 'unavailable', or stale cache ≤ 3 h with ageMin
  → AssessResponse (200; 400 invalid_params/out_of_coverage; 502 all_upstreams_failed)
  → web: @breeze/core computes category/verdict/window/tips for current profile
  → render sections; each section independently shows ok/stale/unavailable
  → CloudWatch: one structured JSON line (requestId, per-upstream ms + status, cache hit/miss)
```

### Side flows

- **Geocode:** SearchBox → Open-Meteo Geocoding (browser-direct, keyless, `countryCode=IN` + client filter). GPS label → BigDataCloud reverse geocode; **never blocks data loading** (FR-03) — show "Your location" while it resolves.
- **Sensitive toggle (FR-09):** localStorage write + synchronous `@breeze/core` re-run over the cached `AssessResponse` in memory. **Zero network.** This is the architectural payoff of ADR-0001.
- **Share card (P1):** render off-screen 540×675 @2x from the *same* core output + `measuredAt`; `html-to-image` → PNG; link is the current URL (deep link = URL-as-state).
- **Offline:** in-memory TanStack cache only; cold offline = error card + Retry (no write-path, no service worker).

### State ownership map

| State | Owner | Lifetime |
|-------|-------|----------|
| Current place | URL query params | per navigation; shareable |
| Sensitive profile, saved places (≤5) | localStorage | per device |
| AssessResponse | TanStack Query cache | session memory only |
| Upstream raw data | Lambda `cache.ts` | ≤ 60 min fresh / 3 h stale, per instance |
| Anything else | — | does not exist (no DB, ADR-0002) |

## Suggested Build Order (48-hour window)

Dependency graph (edges = "needs"):

```
@breeze/core (types+config first, then logic fns)
   ├──▶ apps/api clients ──▶ /api/assess route ──▶ SAM deploy ──┐
   └──▶ apps/web (fetch+URL state) ──▶ verdict/chart/tips UI ────┤
                                                                 ├──▶ Amplify deploy ──▶ P1 (share/deep link/saved)
                              core tests (boundary matrix) ──▶──┘
```

| # | Build | Depends on | Why this slot (validated against PRD §18) |
|---|-------|-----------|-------------------------------------------|
| 1 | Workspace scaffold + `tsconfig.base.json` + `@breeze/core` **types & config constants** (`AssessResponse`, categories, verdict matrix as data) | — | The *contract* is what both apps import; writing it first lets web and API be built in either order against a fixed interface. Fri evening. |
| 2 | 4 API clients + live proof for 3 places (script) | zod only | Independent of core logic; Fri-evening exit check per §18. Day-one upstream verifications (PRD §8) happen *here*, because an upstream surprise changes the contract, not the UI. |
| 3 | `@breeze/core` logic + Vitest boundary tests | types from #1 | The verdict matrix/30-31 boundaries are the highest-risk correctness surface and are pure — cheapest to test first. Sat morning. |
| 4 | `/api/assess` route + `cache.ts` + `dev.ts` + Vite proxy | #1, #2, #3 | Smoke script green locally = Sat-morning exit. Everything upstream of deploy is now done. |
| 5 | Web P0: URL state + fetch + VerdictCard + reading + chart + tips + provenance | #1, #4 (local) | Works end-to-end locally before any AWS. Sat midday. UI can start before #4 finishes using the contract types, but must integrate against the local API, never mocks (honesty constraint). |
| 6 | **First SAM deploy → Function URL; connect Amplify → public URL** | #4, #5 skeleton | **Deploy mid-build, not at the end.** Sat ~afternoon; hard gate is Sat 6 PM. Deployment friction (SAM auth, quota, Function URL CORS) is the most schedule-risky item — burn slack on it while the UI can still absorb the evening. |
| 7 | Sensitive toggle, stale/unavailable states, a11y pass | #5, #6 | Sat evening per §18; toggle is pure-core so it's low-risk once #3 is done. |
| 8 | P1: share card, deep link polish, saved places, about sheet | #6 (URL live) | Sun AM. Deep link is *already* the URL-as-state mechanism — P1 is mostly rendering + Web Share plumbing. |
| 9 | P2 (FIRMS panel, OG preview) only if everything above is shipped | #6 | OG preview adds a server-side HTML+rendering dependency — highest integration risk, correctly last. |

**Build-order implications in one line:** the no-build core + contract-first types make #3/#4/#5 parallelizable, so the real critical path is *deploy friction (#6)* — which is why the architecture says "SAM + Amplify mid-Saturday", not "deploy on Sunday".

## Scaling Considerations

| Scale | Reality for Breeze | Adjustment |
|-------|--------------------|------------|
| Hackathon demo (10s of users) | Single Lambda 512 MB arm64, `ReservedConcurrentExecutions: 10`, in-memory cache mostly misses → upstreams carry load (Open-Meteo/OpenAQ free tiers absorb this easily) | None — ship as-is |
| Launch (~1k users) | Function URL free tier (1M req/mo) plenty; cold starts ~sub-second for this workload; per-instance cache hit-rate low for long-tail places | Raise memory to 1 GB for faster upstream fetches; add `Cache-Control` CDN caching (already `max-age=300`) |
| 100k+ | In-memory cache irrelevant at this width; upstream ToS and rate limits become the binding constraint, not Lambda | Would need edge caching (CloudFront in front of the Function URL) and possibly a real store — explicitly out of scope (ADR-0002) |

**First bottleneck:** upstream latency on cold Lambda (PRD allows 5 s p95 cold) — mitigated by parallel fetches with 4 s timeouts, already in the design. **Second:** OpenAQ rate limits — mitigated by the 15-min server cache.

## Anti-Patterns

### Anti-Pattern 1: tsconfig path aliases for `@breeze/core`

**What people do:** `"paths": {"@breeze/core": ["../core/src"]}` in each app's tsconfig and no dependency in package.json.
**Why it's wrong:** path aliases are compile-time-only; they work flawlessly in Vite and then silently break (or behave differently) inside `sam build`'s temp-dir bundling, because the temp copy has no alias config pointing at files outside the copied tree. This is the exact failure mode in SO Q79230926.
**Do this instead:** real workspace dependency `"@breeze/core": "*"` + npm workspaces symlink + `moduleResolution: Bundler`.

### Anti-Pattern 2: CORS in both the Function URL config and the Hono app

**What people do:** copy a `cors()` middleware snippet from a Hono tutorial *and* configure `FunctionUrlConfig.Cors`.
**Why it's wrong:** both layers emit `Access-Control-Allow-Origin`; the browser sees duplicates and blocks — hours lost debugging "correct" config.
**Do this instead:** Function URL config is the only CORS layer in prod (Pattern 6); dev is same-origin via the Vite proxy and needs none.

### Anti-Pattern 3: Deferring the first cloud deploy to the end

**What people do:** finish the entire UI Saturday night, then start `sam deploy` for the first time.
**Why it's wrong:** the AWS path has the most unknowns (SAM bootstrapping, `--build-in-source` behavior, reserved-concurrency quota, Amplify monorepo detection, origin chicken-and-egg) and the PRD has a hard Sat-6-PM cut rule that drops P1/P2 if no URL exists.
**Do this instead:** deploy a thin but real vertical slice (health + assess) by early afternoon Saturday (Pattern 7, build step #6).

### Anti-Pattern 4: Building `@breeze/core` with a `dist` step + watch

**What people do:** tsup/tsc build to `dist`, `exports` → dist, and a `tsc -w` in the dev loop.
**Why it's wrong:** adds a build-order dependency (web/api must wait for core) and a whole class of stale-dist bugs to a 48-hour build where the consumers are both esbuild-family bundlers that eat TS directly.
**Do this instead:** no-build core (Pattern above); revisit only if core ever gains runtime deps or is published.

### Anti-Pattern 5: `sam local start-api` in the dev loop

**What people do:** route local API development through `sam local` because "it's closer to prod".
**Why it's wrong:** needs Docker, is slow to iterate with, and PRD §13 already marks it optional. The Lambda-specific surface is literally one line (`handle(app)`).
**Do this instead:** Hono `dev.ts` + Vite proxy; verify the Lambda adapter only at real deploys (the smoke script covers this).

### Anti-Pattern 6: Verdict logic drifting back onto the server

**What people do:** "while I'm in `assess.ts`, I'll precompute the verdict to save the client work."
**Why it's wrong:** violates ADR-0001, forks the tested implementation, and adds a network round-trip to the Sensitive toggle.
**Do this instead:** server normalises, client decides. (The one grey area — `selectEffectivePm25` station-vs-model selection — lives in `core` but is *invoked server-side* to build `air.current`; keep it pure so both sides can call it.)

## Integration Points

### External Services

| Service | Integration | Gotchas |
|---------|-------------|---------|
| Open-Meteo Geocoding | Browser-direct GET, keyless | Filter `country_code === 'IN'` client-side as well as `countryCode=IN` |
| BigDataCloud reverse geocode | Browser-direct GET, keyless | Must never block the data path; fallback label "Your location"; terms check is a day-one task |
| Open-Meteo AQ + Forecast | Lambda client, keyless | `timezone=auto` returns **location-local wall-clock strings — never `new Date()` them in the browser's tz** (known sharp edge) |
| OpenAQ v3 | Lambda client, `X-API-Key` env | `bbox=west,south,east,north` order (docs disagree; bbox is unambiguous); `/latest` maps to sensor ids |
| AWS Amplify Hosting | Git-connected, root `amplify.yml` | `appRoot` ⇄ `AMPLIFY_MONOREPO_APP_ROOT` must match; `buildPath: /` required for workspace install |
| AWS Lambda Function URL | SAM `FunctionUrlConfig` | CORS at this layer only; origin matching is exact; `AllowHeaders`/`ExposeHeaders` only matter if custom headers are ever added |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `apps/web` ↔ `apps/api` | HTTPS GET, JSON, zod-validated | The *only* runtime coupling; contract frozen in `@breeze/core` types |
| `apps/web` ↔ `@breeze/core` | in-bundle import | Contributes to the < 200 KB budget — core is pure functions, negligible |
| `apps/api` ↔ `@breeze/core` | bundled by SAM esbuild | Requires `sam build --build-in-source` (see Sources) |
| `apps/web` ↔ Geocoding/BigDataCloud | browser → internet | Keyless by design; bypasses `/api/assess` intentionally |

## Sources

- Official Hono docs — AWS Lambda getting-started + adapter deprecation → standalone `@hono/aws-lambda` (Context7, official) — MEDIUM
- Official Hono `cors` middleware source/docs via Context7 (exact-match origins, preflight short-circuit, wildcard hardening) — MEDIUM
- Official Vite docs — `server.proxy` (Context7) — MEDIUM
- AWS SAM docs — esbuild `BuildProperties`, `sam build --build-in-source` (firecrawl scrape of docs.aws.amazon.com) — MEDIUM
- SO Q79230926 + accepted answer + aws/aws-sam-cli issue #6567 — `sam build` temp-dir breaks npm-workspace symlinks; `--build-in-source` is the fix (3 independent corroborations) — MEDIUM (verified)
- AWS Amplify Hosting official monorepo configuration guide — `amplify.yml` monorepo syntax, `appRoot`, `buildPath: /`, `AMPLIFY_MONOREPO_APP_ROOT` (firecrawl) — MEDIUM
- AWS Lambda CORS API reference + SO Q76944724 + r/aws + OneUptime — single-layer CORS, duplicate-header failure mode (4 corroborations) — MEDIUM (verified)
- Nx blog "Managing TypeScript Packages in Monorepos" + Moonrepo TS project-refs guide + adiun/vite-monorepo example — bundler-does-transpile / tsc-type-checks consensus; aliases compile-time-only; project references overkill at this scale — MEDIUM

---
*Architecture research for: Breeze (serverless air-quality verdict SPA)*
*Researched: 2026-10-11*
