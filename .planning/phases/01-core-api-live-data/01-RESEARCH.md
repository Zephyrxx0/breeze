# Phase 1: Core, API & Live Data - Research

**Researched:** 2026-10-11
**Domain:** Pure-TS decision engine (@breeze/core) + Hono/Lambda BFF (GET /api/assess) over four live upstreams
**Confidence:** HIGH (upstream contracts + stack versions verified same-day in upstream research; new findings this session verified against Context7 official docs and AWS docs)

<user_constraints>
## User Constraints (from 01-CONTEXT.md)

### Locked Decisions (verbatim key bullets — full text in 01-CONTEXT.md `<decisions>`)

- **D-01:** Reason lines are **number-first**. Line 1 leads with the effective PM2.5 + category + source; line 2 carries profile context only for the Sensitive profile; for Standard, line 2 is the extras slot.
- **D-02:** The two extras (*"Getting worse by evening"*, *"Local station reads much higher/lower…"*) **replace line 2 when they fire**; line 1 is never displaced. Exactly 2 reason lines always. Both qualify ⇒ trend extra wins.
- **D-03:** Tips render as **prefix cite + PRD §7.5 text verbatim** — no tip rewrites.
- **D-04:** **@breeze/core emits final, ready-to-render English strings** — no string-mapping layer anywhere.
- **D-05:** Tomorrow's verdict comes **solely from the daytime (06:00–20:00 place-local) mean** of the model forecast. Peak never changes the verdict.
- **D-06:** Tomorrow's peak = **worst hour across all 24 h** (place-local); it is reason line 2.
- **D-07:** Extras are **Today-only**; station-only kills the Tomorrow tab entirely.
- **D-08:** Smoke run = **4 places: 2 metro + 1 tier-2 + 1 small town** (Delhi + Bengaluru/Pune + Jaipur/Lucknow + Jaisalmer/Bulandshahr).
- **D-09:** Smoke PASS bar is **coverage-independent**: schema-valid 200 + some effective PM2.5 per place. Blockers: OpenAQ failing for ALL places, or Open-Meteo failing for ANY place.
- **D-10:** User provides the OpenAQ key in `.env`. **No key-less or mock mode is ever built** — missing key ⇒ station path reports unavailable via normal fail-soft.
- **D-11:** **pnpm workspaces** (overrides PRD §10's "npm workspaces"). Lockfile pnpm-lock.yaml.
- **D-12:** Scaffold = root workspace + fully-real `packages/core` + fully-real `apps/api` + **minimal `apps/web` Vite+React hello-world shell** (proves ADR-0001 browser-import path in Phase 1).
- **D-13:** Root dev loop: `pnpm dev` (:8787 + core watch), `pnpm smoke`, `pnpm test`.
- Carried-forward locks: CPCB half-open bands, never round before classifying · zero data ⇒ "Can't assess right now" · place-local day boundaries, tests pass under TZ=UTC and TZ=Asia/Kolkata · `stale` = cache-fallback-only with ageMin · station-only kills chart/window/Tomorrow, model-only is happy path · best-window ≥15%, A3 suppressed when window mean ≥91 · decision logic client-side only (ADR-0001) · no DB (ADR-0002) · effective-PM2.5 selection ladder (§7.3) · tip rules per PRD §7.5 verbatim.

### the agent's Discretion

Exact tip-cite wording for multi-value triggers; internal module file layout within `apps/api/src/clients` and `packages/core`; specific tier-2/small-town choices from D-08 suggested pairs; structured-log field names; zod schema internals for upstream parsing.

### Deferred Ideas (OUT OF SCOPE)

Full 12-place smoke script (→ Phase 3 pre-deploy gate); FIRMS key/panel (P2/v2); i18n of core strings (PRSP-04 v2).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ASM-04 | Partial assessment when one upstream fails: station-only hides chart/window/Tomorrow; model-only degrades to model-estimate path | `Promise.allSettled` + per-client 4 s AbortController pattern (Architecture Patterns §3); typed per-section failures; blackhole-upstream smoke design (§ Common Pitfalls 5, Code Examples §5); `selectEffectivePm25` returns model path with `confidence: 'Low'` when stations fail/absent |
| DEC-01 | Verdict with Today/Tomorrow tabs, headline, top-2 reasons, matching §7.2 matrix at every boundary (unit-tested) | `categoryFor`/`verdictFor`/`subIndex` signatures + 12-cell matrix + boundary test table (Code Examples §1, Common Pitfalls 2) |
| DEC-02 | Cleanest 3-h daytime block next 24 h, hidden <15% improvement, never an invitation when mean ≥91 | `bestWindow` signature + null-when-below-threshold contract (Code Examples §2); grilling Q6 lock |
| DEC-03 | ≤5 priority-ordered tips, each citing the triggering value | `buildTips` returns structured `{id, cite, text, priority}` with PRD §7.5 text verbatim; D-03 prefix-cite composition (Code Examples §3) |
| DEC-04 | Day boundaries use the Place's local timezone (Today/Tomorrow, 06–20 mean, 05–21 window) | **Wall-clock-on-offset design** — core takes `utcOffsetSeconds`, zero Date-tz dependence (Architecture Patterns §1, Common Pitfalls 1); TZ-diff test invocation via double vitest run (Standard Stack §Testing) |
</phase_requirements>

## Summary

Phase 1 builds two load-bearing pieces greenfield: `@breeze/core` (pure TypeScript decision engine — CPCB categorisation, verdict matrix, effective-PM2.5 selection, best window, tip rules, geo math, and all user-visible English strings) and `apps/api` (Hono `GET /api/assess` that zod-validates input against the India bbox, checks a per-section in-memory TTL cache, fans out to three Phase-1 upstream clients via `Promise.allSettled` with 4 s aborts, and normalises into the PRD §12 `AssessResponse` with per-section ok/stale/unavailable). The critical correctness insight — resolved in this research — is that **timezone independence must be achieved by construction, not by testing**: the Open-Meteo wall-clock-string quirk (Pitfall 1) is eliminated if `@breeze/core` receives `utcOffsetSeconds` from the API and converts instants to place-local wall clock with pure arithmetic, then does all day-boundary logic as integer/string arithmetic on hour indices. That makes the TZ=UTC vs TZ=Asia/Kolkata requirement trivially satisfied and the tests deterministic.

Everything else is straight execution of pre-paid research: upstream contracts are verified (STACK.md, HIGH), Hono's Lambda adapter is a two-line entry (`handle(app)` — verified against hono.dev docs this session), Vitest 5 supports monorepo `test.projects`, and SAM's esbuild bundler needs `--build-in-source` for pnpm workspace symlinks (verified against official AWS SAM docs this session). The genuinely new decisions for the planner are: (a) add `utcOffsetSeconds` to `AssessResponse.location` (small schema extension of PRD §12 — see Open Questions #1), (b) run the smoke script as a self-contained orchestrator that spawns its own blackholed server instance for the fail-soft proof, and (c) run `sam build` (local dry-run, no deploy) at the end of 01-03 to de-risk bundling a day before the Sat deploy gate.

**Primary recommendation:** implement the whole core on `utcOffsetSeconds`-based wall-clock arithmetic (never `new Date(upstreamString)`), author `template.yaml` + a local `sam build --build-in-source` dry-run inside plan 01-03, and make `smoke-live.ts` spawn its own blackhole server (`OPENAQ_BASE_URL=http://10.255.255.1`) so fail-soft is proven by assertion, not by reading code.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CPCB category / sub-index / verdict matrix | Browser (via @breeze/core) | — | ADR-0001: server never computes verdicts; core ships in the client bundle |
| Effective-PM2.5 selection (§7.3 ladder) | Browser (via @breeze/core) | — | Pure function over normalised data; instant Sensitive recompute depends on it being client-side |
| Best window, tips, reason lines, Tomorrow derivation | Browser (via @breeze/core) | — | Same ADR-0001 boundary; core emits final English strings (D-04) |
| Wall-clock/timezone arithmetic | Browser (via @breeze/core) | API (passes `utcOffsetSeconds`) | Core must be TZ-immune by construction; API sources the offset from Open-Meteo responses |
| Input validation (lat/lon, India bbox) | API / Backend | — | Server rejects before any upstream call; SSRF-adjacent abuse + OpenAQ 500s prevented |
| Upstream fetching (Open-Meteo ×2, OpenAQ) | API / Backend | — | BFF keeps keys (OpenAQ) out of the browser; one normalised response |
| Per-section TTL cache + stale-while-error | API / Backend | — | ADR-0002: server's only memory; Lambda in-memory, per-instance optimization only |
| Fail-soft orchestration (allSettled, 4 s aborts, typed failures) | API / Backend | — | Written once in `routes/assess.ts`; never duplicated per-client |
| Geocoding / reverse-geocode | Browser | — | Keyless, browser-side per PRD §8 (rows 1 & 6) — NOT in this phase's API |
| Place UI, chart, verdict card | Browser (apps/web) | — | Phase 2 — this phase ships only the hello-world shell (D-12) |

## Standard Stack

Versions are pinned from upstream research `.planning/research/STACK.md` (npm registry, verified 2026-10-11 — same day; do not re-verify). New this session: hono/vitest/pnpm workspace mechanics via Context7 official docs; SAM esbuild flags via AWS docs.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| typescript | 5.9.3 | Language (strict) | Smoothest tooling path for 48h build (not 7.x native) |
| vitest | 5.0.3 | Unit tests, `test.projects` monorepo runner | Current; supports root `projects` globs; TZ applied via CLI env |
| hono | 4.13.13 | API framework | Web-standards, tiny, one codebase for Lambda + local Node |
| @hono/aws-lambda | 1.0.1 | Lambda adapter | `export const handler = handle(app)`; supports Function URL payload 2.0 [VERIFIED: Context7 /websites/hono_dev] — NOT the deprecated `hono/aws-lambda` subpath |
| @hono/node-server | 2.1.4 | Local dev server (`dev.ts`) | `pnpm dev` on :8787 |
| zod | 4.6.5 | Query-param + upstream response validation | Fast v4; every upstream parse is zod-gated |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | latest (privatenumber/tsx) [WARNING: flagged as suspicious by age heuristic only — 97M wk downloads, official repo; see Package Legitimacy Audit] | Runs `scripts/smoke-live.ts` | Root devDependency; `pnpm smoke` = `tsx scripts/smoke-live.ts`. (Node 22.22 native type-stripping works locally — verified this session — but tsx is the robust choice for workspace+node_modules resolution.) |
| react + react-dom | 19.3.0 | `apps/web` hello-world shell only | D-12: proves `@breeze/core` imports cleanly into a browser bundle |
| vite + @vitejs/plugin-react | 8.3.4 / 6.1.2 | Web shell dev server/build | Version-matched pair |
| AWS SAM CLI | 1.166.2 installed locally (STACK pins 1.168.0) | `template.yaml` + local `sam build` dry-run | pip-installed; bundling verification only in Phase 1 — deploy is Phase 3 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tsx for smoke script | Node 22.22 native `.ts` execution (verified working) | Native strip disallows enums/namespaces and has node_modules-path caveats; tsx avoids both — accept tsx |
| `Intl.DateTimeFormat` tz conversion in core | `utcOffsetSeconds`-arithmetic (recommended) | Intl works but reintroduces host/ICU dependence and defeats the TZ-immunity-by-construction design |
| Two-phase OpenAQ latest fetch (serial) | bbox → parallel `/latest` for 3 nearest (recommended) | Serial adds latency to the p95 budget; parallel costs 3 requests (well under 60/min limit) |
| Vitest `env: { TZ }` per project | Double-run script `TZ=UTC vitest run && TZ=Asia/Kolkata vitest run` (recommended) | In-suite TZ mutation is runner-dependent (jest broke here historically); double-run is bulletproof cross-process |

**Installation (root, pnpm):**

```bash
pnpm add -Dw typescript vitest tsx
pnpm --filter @breeze/core add -D vitest typescript
pnpm --filter @breeze/api add hono @hono/aws-lambda @hono/node-server zod "@breeze/core:workspace:*"
pnpm --filter @breeze/web add react react-dom && pnpm --filter @breeze/web add -D vite @vitejs/plugin-react
```

(Internal deps use the `workspace:` protocol — links locally, resolved by esbuild/Vite via symlink realpath [VERIFIED: Context7 /websites/pnpm_io].)

## Package Legitimacy Audit

> Package Legitimacy Gate run 2026-10-11 via `gsd-tools query package-legitimacy check --ecosystem npm`. All packages also cross-checked against official docs (Context7 hono.dev, vitest.dev, pnpm.io, react.dev) and same-day npm-registry version pins in STACK.md.

| Package | Registry | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----------|-------------|---------|-------------|
| hono | npm | 74M/wk | github.com/honojs/hono | SUS* ("too-new" = patch 7 days old) | Approved — official docs-confirmed; *age-heuristic false positive |
| @hono/aws-lambda | npm | 8.9K/wk | github.com/honojs/hono | SUS* ("too-new") | Approved — official hono.dev docs-confirmed; low downloads expected for an adapter package |
| @hono/node-server | npm | 69M/wk | github.com/honojs/node-server | SUS* ("too-new") | Approved — official docs-confirmed |
| zod | npm | 334M/wk | github.com/colinhacks/zod | SUS* ("too-new") | Approved — official docs-confirmed |
| vitest | npm | 124M/wk | github.com/vitest-dev/vitest | SUS* ("too-new") | Approved — official docs-confirmed |
| tsx | npm | 97M/wk | github.com/privatenumber/tsx | SUS* ("too-new") | Approved — well-established runner; only the age heuristic trips |
| typescript | npm | 307M/wk | microsoft/TypeScript | OK | Approved |
| react / react-dom | npm | 187M / 176M/wk | react (META) | OK | Approved |
| vite | npm | 196M/wk | vitejs/vite | SUS* ("too-new") | Approved — official docs-confirmed |
| @vitejs/plugin-react | npm | 97M/wk | vitejs/vite-plugin-react | SUS* ("too-new") | Approved — official docs-confirmed |

\* Every `SUS` verdict here carries the single reason `"too-new"` — a recent-patch timing artifact on packages with 8M–334M weekly downloads and official documentation, not a slopsquat vector. No `postinstall` scripts detected on any checked package. **Per protocol these remain tagged** — the planner should fold a single human eyeball of the install output into the 01-01 scaffold task (versions are already same-day-pinned in STACK.md), rather than one checkpoint per package.

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged [SUS] needing per-install checkpoint (strict protocol):** hono, @hono/aws-lambda, @hono/node-server, zod, vitest, tsx, vite, @vitejs/plugin-react — *recommended disposition: one consolidated `checkpoint:human-verify` in plan 01-01's install task (evidence: official docs + registry pins), not 8 separate gates.*

## Architecture Patterns

### System Architecture Diagram

```
                        Phase 1 scope
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  pnpm smoke (scripts/smoke-live.ts)                                    │
│     │  (a) spawn dev server :8788  (b) spawn BLACKHOLE server :8789    │
│     ▼                                        ▼                         │
│  ┌─────────────────────── GET /api/assess ───────────────────┐         │
│  │  Hono app (app.ts)                                        │         │
│  │    │ zod validate lat/lon ──fail──▶ 400 invalid_params /  │         │
│  │    │ India bbox 6–38 / 68–98.5       out_of_coverage      │         │
│  │    ▼                                                      │         │
│  │  round to 2 dp ─▶ TTL cache lookup (key: lat2,lon2)       │         │
│  │    │ hit & fresh ─▶ return (status ok, ageMin 0)          │         │
│  │    ▼ miss / stale                                          │         │
│  │  Promise.allSettled  ──▶ Open-Meteo AQ  (4s abort)        │         │
│  │                 ├──▶ Open-Meteo Forecast(4s abort)        │         │
│  │                 └──▶ OpenAQ v3 (key, bbox, 4s abort)      │         │
│  │    ▼                                                      │         │
│  │  normalise → AssessResponse (per-section ok|stale|        │         │
│  │  unavailable; stale = cache-fallback ≤3h with ageMin)     │         │
│  │    │ all sections unavailable & no cache ─▶ 502           │         │
│  ▼    ▼                                                      │         │
│  apps/web hello-shell: import "@breeze/core" compiles        │         │
│  (Phase 2 UI will run:)                                      │         │
│  AssessResponse ──▶ @breeze/core (pure: wall-clock →         │         │
│     category → verdict → reasons → window → tips) ──▶ render │         │
└────────────────────────────────────────────────────────────────────────┘
   Upstreams:  air-quality-api.open-meteo.com   api.open-meteo.com
               api.openaq.org (X-API-Key from env, .env only)
```

### Recommended Project Structure

```
breeze/
├── pnpm-workspace.yaml          # packages: apps/*, packages/*
├── pnpm-lock.yaml
├── tsconfig.base.json           # strict, ES2023, moduleResolution: bundler
├── vitest.config.ts             # test.projects: ['packages/core', 'apps/api']
├── .env                         # OPENAQ_API_KEY (gitignored, never committed)
├── packages/core/
│   ├── package.json             # name @breeze/core, "type":"module",
│   │                            # exports "." → "./src/index.ts" (NO build step)
│   ├── src/
│   │   ├── index.ts             # public surface
│   │   ├── config.ts            # ALL CPCB/tip/window constants (one module)
│   │   ├── types.ts             # Category, Verdict, Profile, Confidence, HourPoint…
│   │   ├── wallclock.ts         # parse/format WallClock, wallFromInstant(iso, offset)
│   │   ├── category.ts          # categoryFor, subIndex
│   │   ├── verdict.ts           # verdictFor, reasonLines (D-01/D-02/D-06)
│   │   ├── effective.ts         # selectEffectivePm25 (§7.3), confidenceFor
│   │   ├── window.ts            # bestWindow (§7.4)
│   │   ├── tips.ts              # buildTips (§7.5, D-03 cite-prefix)
│   │   └── geo.ts               # haversineKm, bearingDeg, isUpwind
│   └── test/                    # boundary, matrix, window, tips, TZ-diff, geo
├── apps/api/
│   ├── package.json             # deps: hono, @hono/aws-lambda, @hono/node-server,
│   │                            # zod, "@breeze/core":"workspace:*"
│   ├── src/
│   │   ├── app.ts               # Hono app: routes + onError; NO cors() (Phase 3)
│   │   ├── lambda.ts            # export const handler = handle(app)   ← 2 lines
│   │   ├── dev.ts               # serve({fetch: app.fetch, port: env PORT ?? 8787})
│   │   ├── routes/assess.ts     # validate → bbox → cache → allSettled → normalise
│   │   ├── routes/health.ts     # GET /api/health
│   │   ├── cache.ts             # per-section TTL cache (module scope)
│   │   └── clients/
│   │       ├── openmeteoAir.ts  # + *_BASE_URL env override
│   │       ├── openmeteoForecast.ts
│   │       └── openaq.ts
│   ├── template.yaml            # SAM: Metadata BuildMethod esbuild
│   └── test/                    # route tests + blackhole fail-soft test
├── apps/web/                    # hello-world Vite+React shell (D-12)
└── scripts/smoke-live.ts        # 4-place smoke + blackhole fail-soft (D-08/D-09)
```

### Pattern 1: Wall-clock-on-offset (THE timezone pattern)

**What:** Core represents every upstream timestamp as a `WallClock` string (`"2026-10-11T15:00"`, place-local, offset-less) plus an explicit `utcOffsetSeconds: number`. Conversion instant→wall-clock is `new Date(epochMs + offsetSeconds * 1000)` read via **UTC** getters only; ALL day-boundary logic (Today/Tomorrow split, 06:00–20:00 mean, 05:00–21:00 window restriction, "now" hour) is integer arithmetic on parsed `{date, hour}` — never `new Date(wallString)`.
**When to use:** Everywhere core touches time. The API stores Open-Meteo's `utc_offset_seconds` into `AssessResponse.location` (see Open Questions #1 — small extension of PRD §12's `location` object).
**Why:** Open-Meteo time strings are offset-less wall clock (STACK.md, HIGH). This design makes TZ=UTC/TZ=Asia/Kolkata test parity true *by construction* — the host timezone is never consulted. DST is a non-issue for India but the design handles it anyway (offset is request-time-fixed, matching the upstream contract).

```ts
// Source: design resolved from STACK.md upstream contract + Pitfall 1; arithmetic is pure
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

### Pattern 2: Core function surface (exact signatures)

**What:** The PRD §11 function list, specified to implementation-ready precision. All in `packages/core/src`, all pure, all taking data — never fetching.

```ts
// category.ts — CPCB half-open bands [0,30] (30,60] (60,90] (90,120] (120,250] (250,∞)
export type Category = "Good" | "Satisfactory" | "Moderate" | "Poor" | "Very Poor" | "Severe";
export type Profile  = "standard" | "sensitive";
export type Verdict  = "Good to go" | "Take care" | "Stay indoors if you can";
export type Confidence = "High" | "Medium" | "Low";

export function categoryFor(pm25: number): Category;    // throws on NaN/negatives (callers filter first)
export function subIndex(pm25: number): number;         // linear interp per band, capped 500; golden: 31→51, 60→100

// verdict.ts — 12-cell matrix per PRD §7.2 (Moderate+Sensitive=Take care is the commonly skipped cell)
export function verdictFor(category: Category, profile: Profile): Verdict;

export interface ReasonLinesInput {
  effective: EffectivePm25;                            // value + source + station info
  profile: Profile;
  next6hPeakWorse: boolean;                            // D-02 extra 1
  stationModelRatio: number | null;                    // D-02 extra 2 (station/model)
  tomorrow?: {                                          // present only for the Tomorrow tab
    daytimeMean: number; peakHourLabel: string; peakCategory: Category;
  };
}
export function reasonLines(input: ReasonLinesInput): [string, string];   // exactly 2 lines, D-01/D-02/D-06/D-07

// effective.ts — §7.3 ladder in one tested place
export interface StationReading {
  id: number; name: string; provider?: string;
  lat: number; lon: number;                            // core computes distanceKm via haversineKm
  pm25: number; units: "µg/m³"; measuredAtUtc: string; // ISO UTC instant
}
export interface EffectivePm25 {
  pm25: number;
  source: "station" | "model";
  measuredAt: string;                                  // ISO UTC
  station?: { id: number; name: string; distanceKm: number; provider?: string };
  modelDistanceNote?: "~45 km";                        // label fragment for the model path
  confidence: Confidence;                              // High ≤5km&<1h, Medium ≤25km, Low = model
}
export function selectEffectivePm25(input: {
  stations: StationReading[];
  modelPm25Now: number | null;
  modelOffsetSeconds: number;
  nowMs: number;
}): EffectivePm25 | null;                              // null only when NO model either → "Can't assess"

// window.ts — §7.4: next 24h, 05:00–21:00 local, 3h sliding mean, min; null below 15% improvement
export interface BestWindow {
  startWall: WallClock; endWall: WallClock; meanPm25: number; improvementPct: number;
}
export function bestWindow(hourly: { time: WallClock; pm25: number }[],
                           nowWall: WallClock): BestWindow | null;

// tips.ts — §7.5 rules verbatim; top-5 by priority; cite = triggering value prefix (D-03)
export interface Tip { id: "A1"|"A2"|"A2b"|"A3"|"A4"|"A5"|"A6"|"A7"|"A8";
                       cite: string; text: string; priority: number; }
export function buildTips(ctx: { effectivePm25: number; window: BestWindow | null;
  uv: number | null; feelsLikeC: number | null; rainProbNext6h: number | null; },
  profile: Profile): Tip[];                            // A3 auto-suppressed when window.meanPm25 ≥ 91
export const formatTip = (t: Tip) => `${t.cite} — ${t.text}`;   // the D-04 final string

// geo.ts
export function haversineKm(a: {lat:number;lon:number}, b: {lat:number;lon:number}): number;
export function bearingDeg(a: {lat:number;lon:number}, b: {lat:number;lon:number}): number;
export function isUpwind(bearingFromPoint: number, windFromDeg: number, maxDeg = 45): boolean;  // P2, tiny
```

**When to use:** These are the contract between plans 01-01, 01-02, 01-03 and Phase 2. The API imports only *types* from core; it never calls verdict functions (ADR-0001).

### Pattern 3: Per-section TTL cache (Lambda-safe)

**What:** `cache.ts` module-scope `Map<string, SectionEntry>` where key = `` `${lat2},${lon2}` `` and each entry holds per-section `{ data, fetchedAtMs }`. Freshness: OpenAQ 15 min, Open-Meteo AQ 60 min, Forecast 30 min (PRD §8 TTLs). On upstream failure, a cached copy **≤3 h old** is served as `stale` with `ageMin`; older than 3 h ⇒ `unavailable`. Cache affects **latency only, never semantics** (Pitfall 5): responses always carry `fetchedAt`/`ageMin`/`status` regardless of hit/miss. Cap ~200 keys with eviction-on-write (simple FIFO insert-order eviction is enough at this scale).

```ts
// Source: Pitfall 5 + ADR-0002; PRD §8 TTLs
interface SectionEntry<T> { data: T; fetchedAtMs: number }
const store = new Map<string, Record<string, SectionEntry<unknown>>>();
const STALE_MAX_MS = 3 * 60 * 60 * 1000;              // stale-while-error ceiling

export function getFresh<T>(key: string, section: string, ttlMs: number, now = Date.now()): T | null;
export function setSection<T>(key: string, section: string, data: T, now = Date.now()): void;
export function getStaleFallback<T>(key: string, section: string, now = Date.now()): { data: T; ageMin: number } | null;
```

### Pattern 4: Fail-soft orchestration in routes/assess.ts

**What:** Validate → bbox → round → cache → `Promise.allSettled` over three clients (each self-timing-out at 4 s via `AbortController`) → normalise. A rejected/`unavailable` client becomes that section's typed failure; recent cache becomes `stale`; every section down + no cache ⇒ 502 `all_upstreams_failed`. `air` status derives from {AQ, OpenAQ}; `weather` from Forecast.

```ts
// Source: PRD §9 lifecycle + Pitfall 5; client shape per PRD §11
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

**Every client** takes `{ signal, baseUrl }` — `baseUrl` defaults to the PRD §8 URL but is env-overridable (`AIR_BASE_URL`, `FORECAST_BASE_URL`, `OPENAQ_BASE_URL`). **This env override is the blackhole mechanism** for the fail-soft test (Pattern 5).

### Pattern 5: Self-contained smoke with blackholed upstream

**What:** `scripts/smoke-live.ts` targets `SMOKE_BASE_URL ?? http://localhost:8787` for the 4-place run (D-08/D-09), then **spawns its own second server** with `OPENAQ_BASE_URL=http://10.255.255.1` (non-routable ⇒ connection hangs ⇒ proves the 4 s abort path) on another port and asserts: HTTP 200, `air.current.source === "model"`, `sources.openaq.status === "unavailable"`. An optional second variant `http://127.0.0.1:9` proves the instant-refused path. Coverage-independent pass bar; prints station-vs-model mix and per-source statuses; non-zero exit only on D-09 blockers.

```ts
// Source: D-08/D-09/D-10 + Pitfall 5 "kill one upstream" requirement
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

Phase 3 reuses the same script against the deployed Function URL via `SMOKE_BASE_URL=https://…`.

### Anti-Patterns to Avoid

- **`new Date(upstreamTimeString)` anywhere in core or API** — silently parses in the host timezone; the single highest-severity bug in this build (Pitfall 1). Lint-level rule: no `new Date(` with a string argument outside tests.
- **Rounding before classifying** (`Math.round(30.4)`) — mis-buckets at CPCB edges; classify on the continuous value, round only for display (Pitfall 2).
- **Verdict logic creeping into `apps/api`** — server normalises data only; if a route needs a category to make a decision, the design is wrong (ADR-0001).
- **Cache influencing response semantics** — any field derivable only from cache state is a bug; `stale` must always carry `ageMin` (Pitfall 5).
- **`Promise.all` over upstreams** — one hung upstream kills the whole response; `allSettled` + per-client 4 s abort is the invariant (Pitfall 5).
- **Fixtures or mock data in `apps/` product code** — fixtures live in `test/` and `scripts/` only (data-honesty constraint, PRD §17).
- **`hono/cors` middleware in `app.ts`** — CORS is configured once, on the Function URL (Phase 3); adding it in code creates duplicate-header failures (Pitfall 3). Local dev uses the Vite proxy in Phase 2 (same-origin), so no local CORS is needed either.
- **tsconfig path aliases for `@breeze/core`** — use the real `workspace:*` dependency; aliases break SAM's temp-dir bundling (project research).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone conversion | Intl/Date-tz gymnastics per call site | The single `wallFromInstant` + `parseWall` pair (Pattern 1) | One audited implementation; host-TZ immunity by construction; TZ-diff tests pass trivially |
| HTTP timeouts | `Promise.race` wrappers per call | `AbortController` + native `fetch` signal (Pattern 4) | Aborts actually cancel the socket; race leaves sockets leaking toward the 10 s Lambda limit |
| Input validation | Ad-hoc `if (isNaN(lat))` chains | zod schema (`lat: z.coerce.number().min(6).max(38)`, same for lon) | One schema gives 400 `invalid_params` vs `out_of_coverage` codes and typed errors for free |
| Upstream response parsing | `any` + optional chaining | zod schema per upstream, `.safeParse`, negative-value filters | Upstream shape drift becomes a typed `unavailable`, never a crashed invocation (Pitfall 9) |
| Haversine/bearing | Copy-pasted formulas per call site | `geo.ts` single implementation, unit-tested with known city-pair distances | §7.3 selection correctness depends on it; P2 upwind reuses it |
| Running TS scripts | Custom build step for `scripts/` | tsx (or Node ≥22.18 type-stripping) | Zero-build dev loop; smoke script stays one file |

**Key insight:** the deceptively hard parts here (timezones, CPCB fractional boundaries, median-of-nearest-3 selection) are all *specification* problems, not algorithm problems — each has exactly one right answer once pinned down, so the core's value is in being the single tested implementation, not in cleverness.

## Common Pitfalls

### Pitfall 1: Host-timezone leakage into core (Pitfall 1 of project research — THE Phase-1 risk)
**What goes wrong:** Day boundaries computed via host-tz `Date` shift under TZ=UTC but not IST (or vice versa) — wrong Today/Tomorrow split, wrong "now" hour, wrong daytime mean.
**Why it happens:** ISO-looking wall-clock strings feel `Date`-parseable.
**How to avoid:** Pattern 1 (offset-based wall clock, UTC getters only); `test:tz` double-run script; a unit test asserting `wallFromInstant` output is identical regardless of `process.env.TZ`.
**Warning signs:** any `new Date(` with a string arg; a test that passes under one TZ and fails under the other.

### Pitfall 2: CPCB boundary/rounding + naming
**What goes wrong:** Fractional values mis-bucketed; sub-index diverges from CPCB calculator; copy says "AQI".
**How to avoid:** Half-open continuous bands in `config.ts`; golden tests at 30/30.1, 60/60.1, 90/91, 120/121, 250/250.1 **and** CPCB's own published pairs (sub-index 51 at 31 µg/m³, 100 at 60 µg/m³); all user-visible strings say "PM2.5 category" (CONTEXT.md glossary forbids "AQI").

### Pitfall 3: OpenAQ call-pattern and units
**What goes wrong:** bbox axis order wrong (lon-first!) ⇒ empty results or 500; `/latest` value unit not checked; 10 `/latest` calls blow the 60/min budget on retries.
**How to avoid:** bbox = `west,south,east,north` (verified, STACK.md); `limit=20` bbox search → core-side haversine ≤25 km → **up to 3 nearest** get parallel `/latest` calls (median-of-nearest-3 needs 3, not 10); assert `parameter.units === "µg/m³"` per zod schema; an OpenAQ 500 maps to station-section `unavailable`, never a crash.

### Pitfall 4: ESM/workspace resolution in three different runners
**What goes wrong:** `@breeze/core` resolves under vitest+tsx but breaks in SAM's esbuild bundle (pnpm symlinks not mounted) or in Vite's pre-bundle.
**How to avoid:** real `workspace:*` dep + `exports → src/index.ts` + `"type": "module"`; local `sam build --build-in-source` dry-run at the end of 01-03 (verified flag per AWS docs, this session); hello-web shell proves the Vite path in 01-01 (D-12).

### Pitfall 5: Fail-soft tested by reading code instead of breaking things
**What goes wrong:** "We used allSettled so it degrades" — until a timeout path was never actually exercised and one upstream hangs past the Lambda timeout in the demo.
**How to avoid:** Pattern 5 — blackhole (`10.255.255.1`, forces abort) asserted in both smoke and an api unit test; exit non-zero if the section isn't `unavailable`.

### Pitfall 6: Secrets and log hygiene from commit one
**What goes wrong:** OpenAQ key committed, or in a client bundle, or in a log line.
**How to avoid:** `.env` gitignored from the first commit; key read only via `process.env.OPENAQ_API_KEY` in `clients/openaq.ts`; missing key ⇒ client returns typed `unavailable` (D-10 — no mock mode ever); structured logs carry 2-dp coords, never full precision (PRD §16).

## Code Examples

Verified patterns from official sources:

### Hono Lambda + local dev entrypoints
```ts
// apps/api/src/lambda.ts — Source: hono.dev/docs/getting-started/aws-lambda [VERIFIED: Context7]
import { handle } from "@hono/aws-lambda";
import { app } from "./app";
export const handler = handle(app);            // Function URL payload 2.0 events share the v2 shape

// apps/api/src/dev.ts — Source: @hono/node-server docs
import { serve } from "@hono/node-server";
import { app } from "./app";
serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8787) });   // PORT override enables smoke's 2nd instance
```

### Zod query validation with distinct error codes
```ts
// Source: PRD §12 error codes; zod v4 API
import { z } from "zod";
const Query = z.object({
  lat: z.coerce.number({ invalid_type_error: "invalid_params" }).min(6).max(38),
  lon: z.coerce.number({ invalid_type_error: "invalid_params" }).min(6).max(98.5),
});
const parsed = Query.safeParse(c.req.query());
if (!parsed.success) return c.json({ error: "invalid_params" }, 400);   // bounds fail ⇒ distinguish out_of_coverage
const lat2 = Math.round(parsed.data.lat * 100) / 100;                   // 2-dp rounding = cache-key identity
```

### Vitest monorepo + TZ-diff invocation
```ts
// vitest.config.ts — Source: Vitest v5.0.3 docs/guide/projects [VERIFIED: Context7]
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { projects: ["packages/core", "apps/api"] } });
```
```json
// package.json scripts — TZ applied at CLI level per Vitest common-errors docs (worker-pool safe)
{ "test": "vitest run", "test:tz": "TZ=UTC vitest run && TZ=Asia/Kolkata vitest run" }
```

### CPCB categorisation (the boundary-correct shape)
```ts
// Source: PRD §7.1 + carried-forward lock (half-open continuous, never round)
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

### Blackhole base-URL override in a client
```ts
// Source: Pitfall 5 remediation ("kill one upstream"); env-override pattern
const DEFAULT_BASE = "https://api.openaq.org";
export async function fetchOpenAq(lat: number, lon: number, o: { signal: AbortSignal; key?: string; baseUrl?: string }) {
  const base = o.baseUrl ?? process.env.OPENAQ_BASE_URL ?? DEFAULT_BASE;
  const west = lon - 0.25, south = lat - 0.25, east = lon + 0.25, north = lat + 0.25;
  const url = `${base}/v3/locations?bbox=${west},${south},${east},${north}&parameters_id=2&limit=20`;
  const res = await fetch(url, { signal: o.signal, headers: o.key ? { "X-API-Key": o.key } : undefined });
  // …zod safeParse → typed ClientResult; missing key ⇒ return { ok: false, error: "no key" } (never mock)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `hono/aws-lambda` subpath import | standalone `@hono/aws-lambda` package | Hono 4.13.10 (adapters split out; subpath removed in v5) | `import { handle } from "@hono/aws-lambda"` — the pinned 1.0.1 is the only supported path |
| `vitest.workspace.ts` file | `test.projects` in `vitest.config.ts` | Vitest 3.2+ (file form legacy) | One root config; use `projects`, not the workspace file |
| npm workspaces (PRD §10 wording) | pnpm workspaces + `workspace:` protocol | User decision D-11, 2026-10-11 | `sam build --build-in-source` becomes mandatory for symlink resolution |
| Node 18/20 Lambda runtimes | nodejs24.x arm64 | 2025 (24 GA; 22 EOLs Apr 2027) | dev on Node ≥22.12 works; prod targets 24 |

**Deprecated/outdated:** `vitest.workspace.ts` (use `test.projects`) · `hono/aws-lambda` subpath (standalone package) · npm workspaces for this repo (pnpm, per D-11).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `AssessResponse.location` gains `utcOffsetSeconds: number` (from Open-Meteo `utc_offset_seconds`) — a small extension of PRD §12's shape, required for the TZ-immune core design | Pattern 1 | MEDIUM — if rejected, core needs `Intl.DateTimeFormat` offset lookup per place (more moving parts, still workable) |
| A2 | `smoke-live.ts` runs via `tsx` root devDependency (not global; Node 22.22 native `.ts` execution exists as fallback — verified working this session) | Standard Stack | LOW — native strip works locally but has node_modules/enum caveats |
| A3 | OpenAQ flow = 1 bbox call + parallel `/latest` for up to 3 nearest locations (PRD §8 shows singular `{id}/latest`, but §7.3 median-of-nearest-3 needs 3) | Pitfall 3 | LOW — call count (4/miss) is far under the 60/min limit; alternate design fetches 1 latest and drops the median path near metros |
| A4 | `template.yaml` is authored and `sam build --build-in-source` dry-run (no deploy) is verified inside plan 01-03, one day before the Phase 3 deploy gate | Pitfall 4 | LOW — deferring all bundling knowledge to Phase 3 is the riskier alternative |
| A5 | The 10 "too-new" SUS legitimacy verdicts are age-heuristic false positives on established packages (all docs-confirmed, 8M–334M wk downloads) — one consolidated human-verify, not 10 gates | Legitimacy Audit | LOW — versions are same-day-pinned from the npm registry in STACK.md |

## Open Questions

1. **Add `utcOffsetSeconds` to `AssessResponse.location`?**
   - What we know: PRD §12 lists `location: { lat, lon, timezone }`; Open-Meteo responses carry `utc_offset_seconds` (HIGH, STACK.md).
   - What's unclear: whether the planner may extend the §12 shape in Phase 1 or must wait for a spec tweak.
   - Recommendation: **extend it now** (A1) — one field, sourced from an upstream we already call; it is the linchpin of TZ-immune core. Phase 2's chart night-shading needs it too.

2. **Smoke server lifecycle.** 01-CONTEXT.md says smoke targets the `pnpm dev` server; the fail-soft section needs a *second, blackholed* server anyway.
   - Recommendation: smoke self-spawns both instances (Pattern 5) and treats `SMOKE_BASE_URL` as the Phase-3 override; `pnpm dev` stays the human dev loop. Keeps `pnpm smoke` one-command reproducible.

3. **Severe-band sub-index cap.** PRD §7.1 gives Severe sub-index 401–500 for "above 250" with no upper concentration bound.
   - Recommendation: map (250, 500 µg/m³] → 401–500 and cap at 500 above that (matches CPCB calculator); verify one Severe golden value during 01-01.

4. **Local Node 22.22.2 vs Lambda nodejs24.x.** Dev machine is on 22.22 (≥ Vite 8's 22.12 floor — fine); prod runtime is 24.
   - Recommendation: acceptable for Phase 1 (no 24-only APIs needed); note in README; Phase 3 deploy must not depend on Node 22-vs-24 behavioral differences (there are none for this code).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | everything | ✓ | v22.22.2 | prod runtime is nodejs24.x (Phase 3 concern only) |
| pnpm | workspaces (D-11) | ✓ | 12.10.1 | — |
| SAM CLI | template.yaml + `sam build` dry-run (A4) | ✓ | 1.166.2 (pip) | STACK pins 1.168.0 — minor; upgrade optional |
| aws CLI | `sam deploy` | ✗ | — | **Not needed in Phase 1**; install via pip before Phase 3 |
| tsx | `pnpm smoke` | ✗ (not global) | — | add as root devDependency (A2); Node native `.ts` strip verified as backup |
| OpenAQ API key | station path (D-10) | user-provided in `.env` | — | no key ⇒ station section `unavailable` via normal fail-soft (by design, no mock mode) |

**Missing dependencies with no fallback:** none for Phase 1. (aws CLI blocks only Phase 3's deploy.)

## Security Domain

> `security_enforcement: true`, ASVS level 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No accounts; public read-only endpoint |
| V3 Session Management | no | Stateless; no cookies |
| V4 Access Control | no | CORS allow-list lands Phase 3 on the Function URL (never `*` in prod, Pitfall 3) |
| V5 Input Validation | **yes** | zod query schema + India bbox bounds before any upstream call; zod parse of every upstream response (drop negatives, assert units) |
| V6 Cryptography | no | Nothing to encrypt; never hand-roll |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed lat/lon driving upstream abuse / odd cache keys | Tampering | zod + bbox validation + 2-dp rounding before cache keying |
| OpenAQ key leakage (repo, bundle, logs) | Information Disclosure | `.env` gitignored; env-only reads in `clients/openaq.ts`; key never in responses/logs; `grep` built artifacts in Phase 3 |
| Upstream returning hostile/malformed payloads | Tampering | zod `safeParse` per client → typed `unavailable`; no `eval`, no HTML passthrough (response is JSON numbers/strings only) |
| Coordinate precision in logs | Information Disclosure | Structured logs at 2 dp (server) / 1 dp (CloudWatch, PRD §16) |
| Function URL cost abuse | Elevation of Privilege | Phase 3: exact-origin CORS allow-list + reserved concurrency 10 + budget alert (out of Phase 1 scope, noted here for traceability) |

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — pinned versions + upstream contracts (npm registry + first-party docs, verified 2026-10-11; build-on, not re-verified)
- `.planning/research/PITFALLS.md` — pitfalls 1/2/5/9 mapped to this phase's patterns
- PRD.md §7/§8/§11/§12/§17 + ADR-0001/0002 + 01-CONTEXT.md — project spec (internal, HIGH)
- Context7 `/websites/hono_dev` + `/llmstxt/hono_dev_llms-full_txt` — `handle()` usage, Function URL support, `LambdaEvent` binding (fetched this session)
- Context7 `/vitest-dev/vitest v5.0.3` — `test.projects`, `env` option, TZ-via-CLI/globalSetup guidance (fetched this session)
- Context7 `/websites/pnpm_io` — workspace protocol, `--filter`, symlink layout (fetched this session)
- AWS SAM official docs (docs.amazonaws.com …/serverless-sam-cli-using-build-typescript.html + sam-build.html) — esbuild `Metadata` properties, `--build-in-source`, `--mount-symlinks` (fetched this session)

### Secondary (MEDIUM confidence)
- Stack Overflow Q77014077 + jest#9856 + nodejs/node#11586/#31478 — Node runtime `process.env.TZ` re-read semantics (community + tracker; corroborated by Vitest docs' CLI-TZ prescription)
- SO Q79230926 + aws/aws-sam-cli#6567 (via project research) — `--build-in-source` necessity for workspace symlinks

### Tertiary (LOW confidence)
- None material this session. (FIRMS CSV column list remains MEDIUM from upstream research — P2, out of phase.)

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — versions pinned same-day from npm registry (upstream research); Hono/Vitest/pnpm mechanics re-verified this session against official docs via Context7.
- Architecture: **HIGH** — every pattern traces to a PRD §section or a project-research pitfall; wall-clock design closes the phase's #1 risk by construction.
- Pitfalls: **HIGH** — Pitfalls 1/2/5/9 are the phase-assigned subset of project research, each with a concrete prevention artifact in this document.

**Research date:** 2026-10-11
**Valid until:** 7 days (fast-moving: Hono adapter + Vitest majors ship frequently; upstream contracts stable)
