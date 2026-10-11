# Phase 1: Core, API & Live Data - Context

**Gathered:** 2026-10-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the two load-bearing foundations of Breeze, verified by tests and live API runs — and nothing user-facing:

1. **`packages/core` (@breeze/core)** — the pure-TypeScript decision engine: CPCB category, verdict matrix, effective-PM2.5 selection, best window, tip rules, geo math, plus the user-visible copy for reason lines and tips. Unit-tested at every boundary, TZ-independent.
2. **`apps/api` — GET /api/assess** — Hono endpoint that validates input against the India bbox, checks an in-memory TTL cache, fans out to four upstream clients (Open-Meteo Air Quality, Open-Meteo Forecast, OpenAQ v3 stations, plus the geocoding/reverse-geocode stay browser-side) via `Promise.allSettled` with 4 s timeouts, and normalises into the PRD §12 `AssessResponse` with per-section ok/stale/unavailable — never a verdict, never a fabricated number.

Verification: boundary + TZ unit tests, and a live smoke run across 4 Indian places with blackhole-upstream fail-soft checks.

**Explicitly NOT in this phase:** search UI, verdict card, chart, tips UI (Phase 2), deploy (Phase 3), toggle/stale states/a11y (Phase 4), sharing (Phase 5). The `apps/web` shell created here is a bare Vite+React hello-world only — no product UI.

</domain>

<decisions>
## Implementation Decisions

### Verdict & reason-line voice (core emits these strings)

- **D-01:** Reason lines are **number-first**. Line 1 leads with the effective PM2.5 + category + source: e.g. *"PM2.5 is 84 µg/m³ — Poor, from a station 3 km away (20 min old)"*, or *"PM2.5 is 84 µg/m³ — Poor, model estimate (~45 km)"*. Line 2 carries profile context, **only for the Sensitive profile** (e.g. "Your Sensitive profile acts at lower levels"); for Standard, line 2 is reserved for the extras slot (D-02).
- **D-02:** The two conditional extras from PRD §7.2 — *"Getting worse by evening"* (next-6-h peak is a worse category) and *"Local station reads much higher/lower than the regional model"* (ratio >2 or <0.5) — **replace line 2 when they fire**; line 1 is never displaced. The card always shows exactly 2 reason lines. If both extras qualify, the trend extra wins (closer to "now"); the comparison extra is the fallback.
- **D-03:** Tips render as **prefix cite + PRD §7.5 text verbatim**: the triggering value first, then the PRD's tip sentence unchanged — e.g. *"PM2.5 is 84 µg/m³ — wear a well-fitted N95 or FFP2 mask outdoors; cloth and surgical masks filter fine particles poorly"*. No tip rewrites; DEC-03's "each citing the value that triggered it" is satisfied by the prefix. (Multi-trigger tips cite the primary trigger: the value that fired the rule per §7.5.)
- **D-04:** **@breeze/core emits final, ready-to-render English strings** — reason lines, tip texts, window phrases. The Phase 2 UI and Phase 5 share card render them verbatim; no string-mapping layer exists anywhere. Localisation (PRSP-04) is v2 and accepts a core change.

### Tomorrow tab derivation (computed in core, Phase 1)

- **D-05:** Tomorrow's verdict comes **solely from the daytime (06:00–20:00 place-local) mean** of the model forecast, classified via the §7.2 matrix with the profile applied. The peak never changes the verdict.
- **D-06:** "Mentions the peak" = the **worst hour across all 24 h of Tomorrow** (place-local). That peak is the Tomorrow tab's reason line 2: e.g. *"Tomorrow evening peaks at Very Poor (~9 PM)"*. Tomorrow's line 1 is the same number-first pattern with the daytime mean: *"Tomorrow's daytime mean is 71 µg/m³ — Poor (model forecast)"*.
- **D-07:** The extras (D-02) are **Today-only** — both are anchored to "now" and would be misleading on Tomorrow. Degradation path per PROJECT.md grilling Q5 stands: station-only kills the Tomorrow tab entirely.

### Smoke run scope & pass bar (live verification)

- **D-08:** The Phase 1 smoke run covers **4 places: 2 metro + 1 tier-2 + 1 small town** — suggested set: Delhi, Bengaluru (or Pune), Jaipur (or Lucknow), and a small town like Jaisalmer (or Bulandshahr) expected to exercise the model-estimate path. The full ≥12-place PRD §17 script remains the Phase 3 pre-deploy gate, not a Phase 1 exit condition.
- **D-09:** Smoke PASS bar is **coverage-independent**: every place returns a schema-valid 200 with per-section statuses and *some* effective PM2.5 (station or model). Zero stations in the small town = expected, not a failure. **Blockers:** OpenAQ failing for ALL places (integration bug, e.g. bbox order) or Open-Meteo failing for ANY place. The station-vs-model mix is printed and reported, not gated.
- **D-10:** The user provides the free OpenAQ API key (and FIRMS MAP_KEY, P2-only) in `.env` before the smoke run; keys go only into Lambda env at deploy. **No key-less or mock mode is ever built** — if a key is missing, the station path reports unavailable through the normal fail-soft path.

### Scaffold & tooling

- **D-11:** **pnpm workspaces** (pnpm-workspace.yaml over `apps/*` and `packages/*`), overriding PRD §10's "npm workspaces" wording — per the user's global preference and pinned STACK.md research. Lockfile: pnpm-lock.yaml.
- **D-12:** Phase 1 scaffold = root workspace + fully-real `packages/core` + fully-real `apps/api` + a **minimal `apps/web` Vite+React shell** (hello-world, no product UI). Rationale: Phase 2 starts from a running dev server and ADR-0001's "core imports cleanly into the browser bundle" assumption is proven in Phase 1, not discovered mid-Phase-2.
- **D-13:** Root dev loop: `pnpm dev` (Hono dev server on :8787 + core in watch mode), `pnpm smoke` (scripts/smoke-live.ts), `pnpm test` (vitest). One terminal for the sprint; per-workspace commands exist but aren't the primary interface.

### Carried-forward locked decisions (do NOT re-litigate — from PROJECT.md / ADRs / grilling)

- CPCB bands are half-open continuous intervals [0,30], (30,60], (60,90], (90,120], (120,250], (250,∞); never round before classifying; sub-index linearly interpolated (grilling Q1).
- Zero air data ⇒ explicit "Can't assess right now" — no verdict word, colour, or client-side fallback (grilling Q2; UI lands Phase 4).
- All day boundaries use the place's local timezone; tests must pass under TZ=UTC and TZ=Asia/Kolkata (grilling Q3).
- `stale` means cache-fallback-only with ageMin; an old-but-freshly-fetched measurement is `ok` (grilling Q4).
- Station/model per-feature degradation: station-only kills chart/window/Tomorrow; model-only is the FR-05 happy path (grilling Q5).
- Best-window chip when ≥15% improvement; tip A3 suppressed when window mean ≥91 µg/m³ (grilling Q6).
- Decision logic runs in the browser via shared @breeze/core — the server never computes verdicts (ADR-0001).
- No database; state in URL + localStorage (ADR-0002). Offline reuses in-memory query cache only (grilling Q10).
- Effective PM2.5 selection: 0.25° bbox → within 25 km → valid/µg/m³/≤3 h old → median of nearest 3 if ≥2 within 10 km, else nearest; confidence High ≤5 km & <1 h, Medium ≤25 km, Low = model (PRD §7.3).
- Tip rules, priorities and top-5 cap per PRD §7.5 verbatim (only the cite prefix is added, per D-03).

### the agent's Discretion

No explicit "you decide" from the user, but downstream agents retain flexibility on: exact tip-cite wording for multi-value triggers (UV + heat firing together, which value leads), internal module file layout within apps/api/src/clients and packages/core, the specific tier-2 and small-town choices from the D-08 suggested sets, structured-log field names, and zod schema internals for upstream parsing.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product spec & decision logic (the source of truth for core behavior)
- `PRD.md` §7 — Decision logic: categories, verdict matrix, effective PM2.5 & confidence, best window, tip rules. Core implements this exactly.
- `PRD.md` §8 — Data sources & API contracts: exact upstream URLs, params, auth, TTLs, and the five day-one verifications.
- `PRD.md` §11 — Repository & modules: intended monorepo layout and the core package's function surface (categoryFor, verdictFor, selectEffectivePm25, bestWindow, buildTips, haversineKm, bearingDeg, isUpwind).
- `PRD.md` §12 — Own API specification: GET /api/assess contract (AssessResponse shape, validation bounds lat 6–38 / lon 68–98.5, error codes, headers) — the exact interface this phase ships.
- `PRD.md` §17 — Testing: boundary tests (30/31, 60/61, 90/91, 120/121, 250/251), full verdict matrix, each tip rule, best-window, geometry; smoke script assertions. Test fixtures are test-only, never shipped.
- `CONTEXT.md` (repo root) — Domain glossary: PM2.5 Category, Verdict, Profile, Place, Assessment, Effective PM2.5, Confidence, Best Window, Stale. All copy produced by core must respect these definitions and avoid-lists.
- `docs/adr/0001-decision-logic-in-the-browser.md` — Verdict logic ships in the client bundle via @breeze/core; server returns raw normalised data only.
- `docs/adr/0002-no-database-state-in-url.md` — No persistence; in-memory TTL cache is the server's only memory.

### Stack & known hazards (pinned research — trust over PRD wording on versions/tooling)
- `.planning/research/STACK.md` — Verified 2026-10-11 versions (Vite 8, React 19.3, Tailwind 4 CSS-first, Hono 4.13 + @hono/aws-lambda@1.0.1 NOT hono/aws-lambda, zod 4, nodejs24.x arm64, pnpm) and the full upstream-contract quirks: Open-Meteo wall-clock time strings (never Date-parse in browser tz), `timeformat=unixtime` + utc_offset_seconds option, grid-cell-centre lat/lon, OpenAQ bbox = west,south,east,north, OpenAQ latest-may-be-old quirk, OpenAQ 60 req/min free-tier, geocoding `results` omitted when empty, FIRMS DAY_RANGE max 5.
- `.planning/research/PITFALLS.md` — Research-flagged pitfalls for this build.
- `.planning/research/SUMMARY.md` — Consolidated research incl. pre-listed fallbacks (deploy fallbacks relevant to Phase 3, not here).

### Roadmap & requirements
- `.planning/ROADMAP.md` Phase 1 — Goal, 5 plans (01-01 scaffold, 01-02 core, 01-03 API scaffold + clients, 01-04 /api/assess, 01-05 live smoke + skeleton), 4 success criteria.
- `.planning/REQUIREMENTS.md` — Phase 1 requirements: ASM-04, DEC-01, DEC-02, DEC-03, DEC-04.
- `.planning/PROJECT.md` — Constraints (48h timeline, perf budget, data-honesty, privacy, budget) and the Key Decisions table.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield repository. Only planning/spec docs exist (PRD.md, CONTEXT.md, docs/adr/, .planning/). No source files, no package.json, no components.

### Established Patterns
- The PRD §11 module layout is the agreed structural pattern: apps/web (React SPA), apps/api (Hono: app.ts / lambda.ts / dev.ts / routes/assess.ts / clients/ / cache.ts / template.yaml), packages/core (pure TS, no I/O), scripts/smoke-live.ts. Follow it rather than inventing a new layout.
- STACK.md's pinned versions are the compatibility pattern — e.g. `@hono/aws-lambda` standalone package (not the deprecated `hono/aws-lambda` subpath), Tailwind 4 CSS-first (no tailwind.config.js), SAM esbuild with `Main: src/lambda.ts`.

### Integration Points
- `packages/core` is imported by both `apps/api` (share types; server does NOT run verdict logic) and `apps/web` (runs all logic) — the shell created in D-12 proves this import path works in a browser bundle.
- `scripts/smoke-live.ts` targets the local Hono dev server (:8787) via `pnpm dev`; Phase 3 reuses it against the deployed Function URL.

</code_context>

<specifics>
## Specific Ideas

- Example copy the user shaped in discussion: reason line *"PM2.5 is 84 µg/m³ — Poor, from a station 3 km away (20 min old)"*; Sensitive line 2 *"Your Sensitive profile acts at lower levels"*; tip prefix *"PM2.5 is 84 µg/m³ — wear a well-fitted N95…"*; Tomorrow peak line *"Tomorrow evening peaks at Very Poor (~9 PM)"*.
- Smoke place set: Delhi + Bengaluru (or Pune) + Jaipur (or Lucknow) + a small town like Jaisalmer (or Bulandshahr) — swap within the suggested pairs at the agent's discretion, but keep the metro/metro/tier-2/small-town spread.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Full 12-place smoke script → Phase 3 pre-deploy gate; FIRMS key/panel → P2/v2; i18n of core strings → PRSP-04 v2.)

</deferred>

---

*Phase: 1-Core, API & Live Data*
*Context gathered: 2026-10-11*
