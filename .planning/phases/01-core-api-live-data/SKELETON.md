# Walking Skeleton — Breeze

**Phase:** 1
**Generated:** 2026-10-11

## Capability Proven End-to-End

A debug-grade browser page pulls a live assessment for a real Indian place through `GET /api/assess` (three live upstreams behind a TTL cache), runs `@breeze/core` in the browser, and renders the verdict string plus its two reason lines, best-window line and tips as plain text.

## Phase-1 Adaptation (read first)

The generic skeleton template expects scaffold + routing + one real DB read/write + one real UI interaction + dev deployment. Breeze deviates deliberately — every deviation below is a locked decision, not laziness:

| Template expectation | Breeze Phase-1 reality | Why |
|---|---|---|
| One real DB read/write | **No database exists.** The server's only memory is an in-memory TTL cache; state lives in URL + localStorage (Phase 2+). The analogue of the DB read is the live upstream read: web shell → Hono route → Open-Meteo Air Quality / Open-Meteo Forecast / OpenAQ. | ADR-0002 (locked) |
| UI interaction | Debug-grade **plain-text** verdict render in `apps/web` — no product UI (01-CONTEXT D-12). Rendering the verdict string proves ADR-0001's browser-import of `@breeze/core`, which is this skeleton's whole point. Phase 2 builds the real verdict card on top. | D-12 + ADR-0001 |
| Deployment to a dev environment | **No deploy until Phase 3.** The Phase-1 proof is the documented local full-stack run: `pnpm dev` (API :8787 + Vite :5173 + core watch) and `pnpm smoke` (self-spawned servers, live upstreams). | ROADMAP phase order; Sat 6 PM cut rule |

> Checkboxes in "Stack Touched in Phase 1" are ticked by plan `01-06` during execution as each item is verified.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Monorepo | pnpm workspaces (`apps/*`, `packages/*`), `workspace:` protocol for internal deps | D-11 overrides PRD §10's npm wording; path aliases break SAM temp-dir bundling (research Pitfall 4) |
| Frontend | React 19.3.0 + Vite 8.3.4 (`@vitejs/plugin-react` 6.1.2), plain `fetch` in Phase 1 | Pinned in STACK.md; shell is debug-grade (D-12), TanStack Query arrives with the real UI in Phase 2 |
| API framework | Hono 4.13.13 + **`@hono/aws-lambda` 1.0.1 standalone package** (never the `hono/aws-lambda` subpath) | hono.dev-verified; one codebase runs local Node (`@hono/node-server`) and Lambda |
| Runtime | Lambda `nodejs24.x` arm64; local dev on Node 22.22 | STACK.md pins (PRD's 22.x is stale); research Open Question #4 adopted — no 24-only APIs used |
| Shared logic | `@breeze/core` pure TypeScript, `exports "." → ./src/index.ts`, no build step | ADR-0001: category/verdict/window/tips computed in the browser only; the server imports data-selection (`selectEffectivePm25`) and geo (`haversineKm`) only — never decision functions |
| Data layer | **None.** In-memory TTL cache (`cache.ts`, module-scope Map, ~200 keys FIFO, stale-while-error ≤ 3 h) | ADR-0002 — server's only memory |
| Auth | None. Public read-only `GET /api/assess`; OpenAQ key lives only in env (Lambda env / local `.env`, gitignored) | PRD §12, 01-CONTEXT D-10 (no key-less or mock mode ever) |
| Input validation | zod at route entry (lat 6–38, lon 68–98.5) + zod parse of every upstream response | ASVS V5; malformed input never reaches an upstream |
| Time | `WallClock` strings + explicit `utcOffsetSeconds` arithmetic (UTC getters only, never `new Date(upstreamString)`) | Open-Meteo wall-clock quirk (STACK.md); `AssessResponse.location.utcOffsetSeconds` adopted per research Open Question #1 |
| CORS | No `cors()` middleware in code; a single allow-list is configured on the Lambda Function URL in Phase 3 | Research Pitfall 3 — duplicate ACAO headers otherwise; local dev uses the Vite `/api` proxy (same-origin) |
| Testing | Vitest `test.projects` monorepo runner + `pnpm test:tz` TZ double-run + live `pnpm smoke` | grilling Q3 lock: identical results under `TZ=UTC` and `TZ=Asia/Kolkata` |

## Stack Touched in Phase 1

- [x] Project scaffold — pnpm workspaces, Vite, Vitest, exact-pinned installs behind one blocking package-legitimacy verify
- [x] Routing — at least one real route: `GET /api/assess` + `GET /api/health` (Hono)
- [x] Database — **adapted (ADR-0002): no database.** One real live upstream read per section (Open-Air Quality, Open-Meteo Forecast, OpenAQ) behind the per-section TTL cache + stale-while-error ≤ 3 h
- [x] UI — debug-grade plain-text verdict render in `apps/web` wired to `/api/assess` via the Vite proxy, computing the verdict with `@breeze/core` in the browser
- [x] Deployment — deferred to Phase 3; Phase-1 proof is the documented local full-stack run: `pnpm dev` + `pnpm smoke`

## Out of Scope (Deferred to Later Slices)

- Product UI of any kind: search box, use-my-location, verdict card, forecast chart, tips UI, weather strip, provenance footer (Phase 2)
- Sensitive toggle, fail-soft UI states, accessibility pass (Phase 4)
- Share card, deep-link polish, saved places, About sheet (Phase 5)
- Deployment, CORS allow-list, CloudWatch log tuning (Phase 3)
- NASA FIRMS client/panel (P2, FR-18 — listed in STATE.md Deferred Items), OG link preview (P2, FR-19)
- Any database, accounts, i18n of core strings (PRSP-04, v2)

## Subsequent Slice Plan

Each later phase adds one vertical slice without altering the decisions above:

- Phase 2: search + use-my-location → single `/api/assess` fetch → verdict card, chart, tips, weather strip, provenance (browser runs `@breeze/core`)
- Phase 3: SAM deploy (Function URL, allow-list CORS, NoEcho key) + Amplify SPA hosting → public URL
- Phase 4: instant Sensitive toggle (client recompute, zero refetch), honest fail-soft states, WCAG AA
- Phase 5: deep link + PNG share card + saved places + About sheet → submission package
