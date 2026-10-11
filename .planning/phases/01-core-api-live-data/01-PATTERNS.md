# Phase 1: Core, API & Live Data - Pattern Map

**Mapped:** 2026-10-11
**Files analyzed:** 32 (all new — greenfield)
**Analogs found:** 0 / 32 in-codebase · 32 / 32 spec-backed

## Greenfield Notice (read first)

**This repository has NO existing application code.** Verified at mapping time: the working tree contains only `.git/`, `.planning/`, `docs/`, `AGENTS.md`, `CONTEXT.md`, `PRD.md`; a glob for `**/*.{ts,tsx,js,json,yaml,yml}` returns **zero files**. There are no controllers, services, components, or tests to copy from.

Therefore "Closest Analog" below means the **authoritative structural/behavioral spec**, in this precedence order:

1. **`PRD.md` §7 / §11 / §12 / §17** — module layout, function surface, `AssessResponse` contract, test matrix (the source of truth for *what* to build).
2. **`.planning/phases/01-core-api-live-data/01-RESEARCH.md`** — implementation-ready, official-doc-verified code examples (Patterns 1–5 + Code Examples sections). These are the closest thing to "code to copy" this phase has, and the planner should paste them into plan actions.
3. **`.planning/research/STACK.md`** — pinned versions + upstream-contract quirks (trust over PRD wording on versions/tooling, per 01-CONTEXT.md).
4. **`AGENTS.md`** — pnpm preference, shell (zsh), project conventions.

Do **not** fabricate code analogs. When the executor reaches for "an existing file to mirror," the answer is always the spec row given in the tables below.

## File Classification

| New File | Plan | Role | Data Flow | Closest Analog (spec source) | Match Quality |
|----------|------|------|-----------|------------------------------|---------------|
| `pnpm-workspace.yaml` | 01-01 | config | — | 01-CONTEXT D-11 + STACK.md (pnpm workspaces over `apps/*`, `packages/*`) | spec-exact |
| `package.json` (root) | 01-01 | config | — | RESEARCH §Standard Stack install block + D-13 scripts (`dev`/`smoke`/`test`/`test:tz`) | spec-exact |
| `tsconfig.base.json` | 01-01 | config | — | RESEARCH project structure comment (`strict, ES2023, moduleResolution: bundler`) | spec-exact |
| `vitest.config.ts` | 01-01 | config | — | RESEARCH Code Example "Vitest monorepo + TZ-diff invocation" (`test.projects`) | spec-exact |
| `.env` + `.gitignore` | 01-01 | config | — | D-10 + RESEARCH Pitfall 6 (OPENAQ_API_KEY gitignored from first commit) | spec-exact |
| `packages/core/package.json` | 01-01 | config | — | RESEARCH Pitfall 4 (`exports "." → ./src/index.ts`, `"type":"module"`, no build step) | spec-exact |
| `packages/core/src/index.ts` | 01-01 | library entry | transform | PRD §11 core function list | spec-exact |
| `packages/core/src/config.ts` | 01-01 | config/constants | — | PRD §7.1/§7.5 + RESEARCH Code Example "CPCB categorisation" (BANDS table) | spec-exact |
| `packages/core/src/types.ts` | 01-01 | model | transform | RESEARCH Pattern 2 type block (`Category`, `Profile`, `Verdict`, `Confidence`, …) | spec-exact |
| `packages/core/src/wallclock.ts` | 01-01 | utility | transform | RESEARCH Pattern 1 (`parseWall` / `wallFromInstant` — THE TZ pattern) | spec-exact |
| `packages/core/src/category.ts` | 01-01 | pure function | transform | PRD §7.1 + RESEARCH Code Example "CPCB categorisation" | spec-exact |
| `packages/core/src/verdict.ts` | 01-01 | pure function | transform | PRD §7.2 12-cell matrix + D-01/D-02/D-06/D-07 + RESEARCH Pattern 2 `reasonLines` | spec-exact |
| `packages/core/src/effective.ts` | 01-01 | pure function | transform | PRD §7.3 selection ladder + RESEARCH Pattern 2 `selectEffectivePm25` | spec-exact |
| `packages/core/src/window.ts` | 01-01 | pure function | transform | PRD §7.4 + RESEARCH Pattern 2 `bestWindow` (null below 15%) | spec-exact |
| `packages/core/src/tips.ts` | 01-01 | pure function | rules/transform | PRD §7.5 verbatim + D-03 cite-prefix + RESEARCH Pattern 2 `Tip`/`formatTip` | spec-exact |
| `packages/core/src/geo.ts` | 01-01 | utility | math/transform | PRD §11 (`haversineKm`, `bearingDeg`, `isUpwind`) + RESEARCH "Don't Hand-Roll" row | spec-exact |
| `packages/core/test/*` | 01-01 | test | — | PRD §17 boundary table + RESEARCH `test:tz` double-run invocation | spec-exact |
| `apps/api/package.json` | 01-02 | config | — | RESEARCH install block (`hono`, `@hono/aws-lambda`, `@hono/node-server`, `zod`, `"@breeze/core":"workspace:*"`) | spec-exact |
| `apps/api/src/app.ts` | 01-03 | controller (app root) | request-response | PRD §11 `app.ts` + RESEARCH Anti-Patterns (NO `cors()` in Phase 1, `onError`) | spec-exact |
| `apps/api/src/lambda.ts` | 01-03 | entry/adapter | request-response | RESEARCH Code Example "Hono Lambda entrypoints" (`handle(app)`, hono.dev-verified) | spec-exact |
| `apps/api/src/dev.ts` | 01-01 | entry/dev server | request-response | RESEARCH Code Example "local dev entrypoint" (`serve({fetch: app.fetch, port})`) | spec-exact |
| `apps/api/src/routes/assess.ts` | 01-03 | route/controller | request-response (fan-out) | PRD §12 contract + RESEARCH Pattern 4 (validate→cache→allSettled→normalise) | spec-exact |
| `apps/api/src/routes/health.ts` | 01-03 | route | request-response | PRD §12 last line (`GET /api/health` → ok, time, build version) | spec-exact |
| `apps/api/src/cache.ts` | 01-03 | store (TTL cache) | cache/stale-fallback | RESEARCH Pattern 3 (per-section TTL Map, stale ≤3 h + ageMin) | spec-exact |
| `apps/api/src/clients/openmeteoAir.ts` | 01-02 | client/service | fetch→transform | PRD §11 client contract + PRD §8 row 1 + STACK.md quirks (wall-clock, `timeformat=unixtime`) | spec-exact |
| `apps/api/src/clients/openmeteoForecast.ts` | 01-02 | client/service | fetch→transform | PRD §11 client contract + PRD §8 row 2 + STACK.md (`daily` requires `timezone`) | spec-exact |
| `apps/api/src/clients/openaq.ts` | 01-02 | client/service | fetch→transform | RESEARCH Code Example "Blackhole base-URL override in a client" + Pitfall 3 (bbox order, units) | spec-exact |
| `apps/api/template.yaml` | 01-03 | config/IaC | — | PRD §13 SAM sketch + STACK.md (nodejs24.x arm64, `@hono/aws-lambda`) + RESEARCH A4 (`--build-in-source` dry-run) | spec-exact (PRD sketch needs runtime bump to nodejs24.x) |
| `apps/api/test/*` | 01-03 | test | — | RESEARCH Pitfall 5 (blackhole fail-soft asserted as unit test) + PRD §17 | spec-exact |
| `apps/web/*` (Vite+React shell) | 01-01 | component/shell | browser bundle | D-12 (hello-world only; imports `@breeze/core` to prove ADR-0001 browser path) + STACK.md pins | spec-exact |
| `scripts/smoke-live.ts` | 01-02 | script (orchestrator) | live HTTP + process spawn | D-08/D-09/D-10 + RESEARCH Pattern 5 (4-place smoke + self-spawned blackhole server) | spec-exact |

**Plan key:** 01-01 = workspace scaffold + core · 01-02 = upstream clients + smoke · 01-03 = `GET /api/assess` (per `.planning/ROADMAP.md` Phase 1).

## Pattern Assignments

### Workspace scaffold (`pnpm-workspace.yaml`, `tsconfig.base.json`, `vitest.config.ts`, root `package.json`) — config

**Analog:** RESEARCH §Standard Stack + Code Examples (no code file exists).

**Install / workspace protocol** (RESEARCH §Standard Stack installation block, lines 104–113):
```bash
pnpm add -Dw typescript vitest tsx
pnpm --filter @breeze/core add -D vitest typescript
pnpm --filter @breeze/api add hono @hono/aws-lambda @hono/node-server zod "@breeze/core:workspace:*"
pnpm --filter @breeze/web add react react-dom && pnpm --filter @breeze/web add -D vite @vitejs/plugin-react
```
Internal deps use the `workspace:` protocol — **never tsconfig path aliases** for `@breeze/core` (RESEARCH Anti-Patterns: aliases break SAM's temp-dir bundling).

**Vitest config** (RESEARCH Code Example, lines 457–465 — Vitest v5 `test.projects`, NOT the legacy `vitest.workspace.ts`):
```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { projects: ["packages/core", "apps/api"] } });
```
```json
// root package.json scripts — D-13 dev loop + D-14 TZ double-run
{ "dev": "…", "smoke": "tsx scripts/smoke-live.ts", "test": "vitest run",
  "test:tz": "TZ=UTC vitest run && TZ=Asia/Kolkata vitest run" }
```

**tsconfig.base.json:** `strict: true`, `target: ES2023`, `moduleResolution: "bundler"` (RESEARCH project-structure comment, line 179).

---

### `packages/core/src/*` — pure function library, transform data-flow

**Analog:** PRD §11 function surface + RESEARCH Pattern 1 & 2 (implementation-ready signatures). The API imports only *types* from core; core never fetches (ADR-0001).

**THE timezone pattern — `wallclock.ts`** (RESEARCH Pattern 1, lines 223–239; closes Phase 1's #1 risk *by construction*):
```ts
type WallClock = string;                       // "2026-10-11T15:00" — place-local, NEVER Date-parsed
const WALL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})/;

export function parseWall(w: WallClock) {
  const m = WALL_RE.exec(w);
  if (!m) throw new Error(`bad wall clock: ${w}`);
  const [, y, mo, d, h] = m;
  return { y: +y, mo: +mo, d: +d, h: +h, day: `${y}-${mo}-${d}` };
}

export function wallFromInstant(epochMs: number, offsetSeconds: number): WallClock {
  const t = new Date(epochMs + offsetSeconds * 1000);   // shift, then read as UTC — host TZ never used
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}T${p(t.getUTCHours())}`;
}
```
ALL day-boundary logic (Today/Tomorrow split, 06–20 mean, 05–21 window, "now" hour) is integer arithmetic on this — **never `new Date(wallString)`** (RESEARCH Anti-Patterns: highest-severity bug; lint rule: no `new Date(` with a string arg outside tests).

**CPCB categorisation — `category.ts` / `config.ts`** (RESEARCH Code Example, lines 468–481; half-open continuous bands, never round before classifying):
```ts
const BANDS = [                      // [lo, hi, category, subLo, subHi]
  [0, 30, "Good", 0, 50], [30, 60, "Satisfactory", 51, 100], [60, 90, "Moderate", 101, 200],
  [90, 120, "Poor", 201, 300], [120, 250, "Very Poor", 301, 400], [250, Infinity, "Severe", 401, 500],
] as const;
export function categoryFor(pm25: number): Category {
  if (!Number.isFinite(pm25) || pm25 < 0) throw new Error(`invalid pm25: ${pm25}`);
  const b = BANDS.find(([lo, hi]) => pm25 > lo && pm25 <= hi) ?? BANDS[0];  // (lo, hi] — 30.1 → Satisfactory
  return b[2];
}
// Tests: 30→Good, 30.1→Satisfactory, 60→Satisfactory, 60.1→Moderate, … 250→Very Poor, 250.1→Severe
//        subIndex(31)===51, subIndex(60)===100 (CPCB golden values)
```

**Exact function surface (the contract between 01-01/01-02/01-03 and Phase 2)** — RESEARCH Pattern 2 (lines 246–310) is implementation-ready; copy the signatures verbatim:
- `categoryFor(pm25): Category` · `subIndex(pm25): number` — PRD §7.1
- `verdictFor(category, profile): Verdict` — 12-cell matrix PRD §7.2 (Moderate+Sensitive=`Take care` is the commonly skipped cell)
- `reasonLines(input): [string, string]` — **exactly 2 lines**, D-01 number-first, D-02 extras replace line 2 only, D-06 Tomorrow variant, D-07 Today-only extras
- `selectEffectivePm25({stations, modelPm25Now, modelOffsetSeconds, nowMs}): EffectivePm25 | null` — §7.3 ladder; `null` only when no model either → "Can't assess right now"
- `bestWindow(hourly, nowWall): BestWindow | null` — §7.4; `null` below 15% improvement
- `buildTips(ctx, profile): Tip[]` + `formatTip = (t) => \`${t.cite} — ${t.text}\`` — §7.5 verbatim, top-5, A3 auto-suppressed when window mean ≥91; **D-04: core emits final ready-to-render English strings**
- `haversineKm` / `bearingDeg` / `isUpwind` — geo

**Tests:** PRD §17 boundary table (30/31, 60/61, 90/91, 120/121, 250/251), full verdict matrix, each tip rule, window, geometry; **TZ-diff via `test:tz` double-run** (RESEARCH: in-suite TZ mutation is runner-dependent — double-run is bulletproof). Fixtures live in `test/` only, never shipped (data-honesty).

---

### `apps/api/src/app.ts`, `lambda.ts`, `dev.ts` — entrypoints, request-response

**Analog:** RESEARCH Code Example "Hono Lambda + local dev entrypoints" (lines 431–441, hono.dev-verified via Context7):

```ts
// apps/api/src/lambda.ts
import { handle } from "@hono/aws-lambda";        // NOT the deprecated "hono/aws-lambda" subpath
import { app } from "./app";
export const handler = handle(app);                // Function URL payload 2.0 events share the v2 shape

// apps/api/src/dev.ts
import { serve } from "@hono/node-server";
import { app } from "./app";
serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8787) });   // PORT override enables smoke's 2nd instance
```

`app.ts`: mount routes + `onError`; **NO `cors()` in Phase 1** — CORS is configured once on the Function URL in Phase 3 (RESEARCH Anti-Patterns / Pitfall 3; adding it in code creates duplicate-header failures).

---

### `apps/api/src/routes/assess.ts` — route/controller, request-response fan-out

**Analog:** PRD §12 contract + RESEARCH Pattern 4 (lines 329–353).

**Orchestration core (copy verbatim):**
```ts
type ClientResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms = 4000): Promise<ClientResult<T>> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try { return { ok: true, data: await fn(ac.signal) }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
  finally { clearTimeout(timer); }
}

const [aq, wx, st] = await Promise.allSettled([
  withTimeout((signal) => fetchOpenMeteoAir(lat, lon, { signal, baseUrl: env.AIR_BASE_URL })),
  withTimeout((signal) => fetchOpenMeteoForecast(lat, lon, { signal, baseUrl: env.FORECAST_BASE_URL })),
  withTimeout((signal) => fetchOpenAq(lat, lon, { signal, baseUrl: env.OPENAQ_BASE_URL, key: env.OPENAQ_API_KEY })),
]);
// → normalise into AssessResponse; air.status/weather.status per §12; sources{} per upstream
```
Lifecycle: zod validate → India bbox → round 2 dp → TTL cache → `allSettled` → normalise. `air` status derives from {AQ, OpenAQ}; `weather` from Forecast. Rejected client = that section's typed failure; recent cache = `stale` with `ageMin`; every section down + no cache ⇒ 502 `all_upstreams_failed`. **Never `Promise.all`** over upstreams (RESEARCH Anti-Patterns).

**Validation** (RESEARCH Code Example, lines 444–454):
```ts
import { z } from "zod";
const Query = z.object({
  lat: z.coerce.number({ invalid_type_error: "invalid_params" }).min(6).max(38),
  lon: z.coerce.number({ invalid_type_error: "invalid_params" }).min(6).max(98.5),
});
const parsed = Query.safeParse(c.req.query());
if (!parsed.success) return c.json({ error: "invalid_params" }, 400);
const lat2 = Math.round(parsed.data.lat * 100) / 100;                   // 2-dp rounding = cache-key identity
```
`routes/health.ts`: `GET /api/health` → ok, time, build version (PRD §12).

---

### `apps/api/src/cache.ts` — store (TTL), cache/stale-fallback data flow

**Analog:** RESEARCH Pattern 3 (lines 316–327):
```ts
interface SectionEntry<T> { data: T; fetchedAtMs: number }
const store = new Map<string, Record<string, SectionEntry<unknown>>>();   // module scope (Lambda-safe, ADR-0002)
const STALE_MAX_MS = 3 * 60 * 60 * 1000;              // stale-while-error ceiling

export function getFresh<T>(key: string, section: string, ttlMs: number, now = Date.now()): T | null;
export function setSection<T>(key: string, section: string, data: T, now = Date.now()): void;
export function getStaleFallback<T>(key: string, section: string, now = Date.now()): { data: T; ageMin: number } | null;
```
TTLs (PRD §8): OpenAQ 15 min, Open-Meteo AQ 60 min, Forecast 30 min. Key = `` `${lat2},${lon2}` ``. Cap ~200 keys with FIFO eviction-on-write. **Cache affects latency only, never semantics** — responses always carry `fetchedAt`/`ageMin`/`status` (RESEARCH Anti-Patterns / Pitfall 5).

---

### `apps/api/src/clients/*.ts` — client/service, fetch→transform

**Analog:** PRD §11 client contract ("each client takes coordinates, calls one upstream with a 4 s timeout, parses with zod, returns a normalised object or a typed failure; no client contains verdict logic") + RESEARCH blackhole client example (lines 484–494):

```ts
const DEFAULT_BASE = "https://api.openaq.org";
export async function fetchOpenAq(lat: number, lon: number, o: { signal: AbortSignal; key?: string; baseUrl?: string }) {
  const base = o.baseUrl ?? process.env.OPENAQ_BASE_URL ?? DEFAULT_BASE;
  const west = lon - 0.25, south = lat - 0.25, east = lon + 0.25, north = lat + 0.25;   // bbox = west,south,east,north
  const url = `${base}/v3/locations?bbox=${west},${south},${east},${north}&parameters_id=2&limit=20`;
  const res = await fetch(url, { signal: o.signal, headers: o.key ? { "X-API-Key": o.key } : undefined });
  // …zod safeParse → typed ClientResult; missing key ⇒ return { ok: false, error: "no key" } (never mock, D-10)
}
```
Every client takes `{ signal, baseUrl }`; `baseUrl` defaults to the PRD §8 URL but is env-overridable (`AIR_BASE_URL`, `FORECAST_BASE_URL`, `OPENAQ_BASE_URL`) — **this env override is the blackhole mechanism** for fail-soft tests.

Per-client contract notes (STACK.md, HIGH — trust over PRD wording):
- **openaq:** `parameters_id=2` (PM2.5); assert `parameter.units === "µg/m³"` per zod schema; bbox search `limit=20` → core-side haversine ≤25 km → up to 3 nearest get **parallel** `/latest` calls; 200 OK does not mean fresh (`datetime.utc` may be old — surface `measuredAt`, never trust status alone); OpenAQ 500/429 ⇒ station section `unavailable`, never a crash.
- **openmeteoAir / openmeteoForecast:** wall-clock time strings (never Date-parse); consider `timeformat=unixtime` + `utc_offset_seconds`; `daily` vars require `timezone=auto`; grid-cell-centre lat/lon is expected; HTTP 400 `{error:true, reason}` ⇒ `unavailable`. **`utc_offset_seconds` from the AQ response feeds `AssessResponse.location.utcOffsetSeconds`** (RESEARCH A1 — linchpin of TZ-immune core).

---

### `apps/api/template.yaml` — config/IaC

**Analog:** PRD §13 SAM sketch (lines 337–366) with two pinned updates: **Runtime `nodejs24.x`** (STACK.md — PRD's `nodejs22.x` is stale) and `import { handle } from "@hono/aws-lambda"` (STACK "What NOT to Use"). Keep `Metadata: BuildMethod: esbuild`, `Architectures: [arm64]`, `Handler: lambda.handler`, Function URL `AuthType: NONE` + CORS params, `OPENAQ_API_KEY` env var. Plan 01-03 ends with a **local `sam build --build-in-source` dry-run** (RESEARCH A4 — flag mandatory for pnpm workspace symlinks), no deploy.

---

### `apps/web/*` — component/shell, browser bundle

**Analog:** D-12 — minimal Vite+React hello-world, **no product UI**. Its single job: import `@breeze/core` and render something, proving ADR-0001's browser-bundle import path (Pitfall 4) in Phase 1. Versions: react/react-dom 19.3.0, vite 8.3.4, @vitejs/plugin-react 6.1.2, Tailwind 4 CSS-first if touched (no `tailwind.config.js`). Phase 2 owns real UI.

---

### `scripts/smoke-live.ts` — script (orchestrator), live HTTP + process spawn

**Analog:** D-08/D-09/D-10 + RESEARCH Pattern 5 (lines 356–372):
```ts
const BLACKHOLE = "http://10.255.255.1";              // non-routable — forces the 4s abort
const child = spawn("pnpm", ["exec", "tsx", "apps/api/src/dev.ts"],
  { env: { ...process.env, PORT: "8789", OPENAQ_BASE_URL: BLACKHOLE }, stdio: "pipe" });
await waitForHealth("http://localhost:8789/api/health", 15_000);
const r = await fetch("http://localhost:8789/api/assess?lat=28.61&lon=77.21");
const body = r.json();
assert(body.air.current?.source === "model", "model-only degrade path");
assert(body.sources.openaq.status === "unavailable", "station section fail-soft");
child.kill();
```
4 places (D-08: Delhi + Bengaluru/Pune + Jaipur/Lucknow + Jaisalmer/Bulandshahr — metro/metro/tier-2/small-town); PASS bar coverage-independent (D-09): schema-valid 200 + *some* effective PM2.5 per place; blockers only = OpenAQ failing ALL places or Open-Meteo failing ANY; prints station-vs-model mix, non-zero exit on blockers. `SMOKE_BASE_URL` override for Phase 3. Runs via `tsx` root devDependency.

---

## Shared Patterns

### Fail-soft client result + 4 s abort
**Source:** RESEARCH Pattern 4 (`withTimeout` + `ClientResult`) — **Apply to:** all three clients and `routes/assess.ts`. One implementation in the route; clients never time themselves out. `Promise.allSettled` is the invariant; `Promise.all` is banned.

### zod validation (query + upstream)
**Source:** RESEARCH Code Examples (query schema above) — **Apply to:** `routes/assess.ts` input gate; **every client** parses its upstream response with `z.safeParse`, drops negatives, asserts units → typed `unavailable`, never a crashed invocation (Pitfall 9).

### Wall-clock discipline
**Source:** RESEARCH Pattern 1 — **Apply to:** all of `packages/core` and any time handling in `apps/api`. API sources `utcOffsetSeconds` from Open-Meteo; core converts instants with UTC getters only. Tests must pass under `TZ=UTC` **and** `TZ=Asia/Kolkata` (locked, grilling Q3).

### ADR-0001: no verdict logic on the server
**Source:** `docs/adr/0001-decision-logic-in-the-browser.md` + PRD §12 "Why no verdict on the server" — **Apply to:** all of `apps/api`. The API imports **types only** from `@breeze/core`; if a route needs a category to make a decision, the design is wrong.

### Fail-soft status vocabulary
**Source:** PRD §12 + RESEARCH Pattern 3/4 — **Apply to:** `routes/assess.ts`, `cache.ts`, all clients. Per-section `ok | stale | unavailable`; `stale` **always** carries `ageMin`; zero air data ⇒ 502 `all_upstreams_failed` (no verdict word anywhere server-side — grilling Q2).

### Secrets & log hygiene
**Source:** RESEARCH Pitfall 6 + Security Domain — **Apply to:** `clients/openaq.ts`, `.gitignore`, smoke script. `.env` gitignored from commit one; key read only via `process.env.OPENAQ_API_KEY`; missing key ⇒ typed `unavailable` (**no key-less or mock mode ever built**, D-10); structured logs at 2 dp coords (1 dp in CloudWatch, PRD §16).

### Data honesty (no fixtures in product code)
**Source:** AGENTS.md constraints + PRD §17 — **Apply to:** everything under `apps/` and `packages/`. Fixtures/mocks live in `test/` and `scripts/` only.

## No Analog Found

No file has an in-codebase analog — the repository is greenfield (verified, see Greenfield Notice). Every file above is instead backed by a named spec source; nothing falls back to guesswork.

| File(s) | Role | Reason | Fallback source |
|---------|------|--------|-----------------|
| *(all 32 files)* | — | Greenfield repo: no `.ts`/`.tsx`/`.js`/`.json`/`.yaml` source files exist | PRD §7/§11/§12/§13/§17 + 01-RESEARCH.md Patterns 1–5 & Code Examples + `.planning/research/STACK.md` + AGENTS.md |
| `apps/web` shell | component | No React code exists anywhere in the repo | D-12 + STACK.md version pins only (shell is deliberately hello-world) |
| `template.yaml` | IaC | No existing SAM template | PRD §13 sketch **modified** per STACK.md: `nodejs24.x`, `@hono/aws-lambda`, `--build-in-source` |

**Planner note:** RESEARCH.md's Code Examples and Patterns 1–5 are official-doc-verified (Context7 hono.dev / vitest.dev / pnpm.io, AWS SAM docs, fetched 2026-10-11) — plan actions should quote them directly as the code to write, citing the line ranges above.

## Metadata

**Analog search scope:** whole repository (`**/*.{ts,tsx,js,json,yaml,yml}` glob, directory listing, `docs/adr/` referenced via CONTEXT canonical refs)
**Files scanned:** 0 source files (greenfield confirmed)
**Spec sources read:** `01-CONTEXT.md`, `01-RESEARCH.md`, `PRD.md` §11–§13 (§7/§8/§17 via canonical refs), `AGENTS.md`, `.planning/ROADMAP.md` Phase 1, `.planning/research/STACK.md` (via AGENTS.md)
**Pattern extraction date:** 2026-10-11
