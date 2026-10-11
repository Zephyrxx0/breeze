# Breeze

## What This Is

Breeze answers one question for any resident or visitor in India: **is the air outside OK for me right now, and what should I do about it?** A user searches for a place or taps *Use my location*; Breeze returns one plain-language verdict (*Good to go* / *Take care* / *Stay indoors if you can*) with reasons, the current PM2.5 labelled honestly as a station reading or a regional model estimate, a 48-hour forecast with the cleanest 3-hour window, a short rule-driven tip checklist, and a shareable card. There are no accounts, no database and no mock data — every number is a live API call that carries a timestamp and is hidden rather than invented when its source fails.

## Core Value

One honest, actionable verdict per place — visible within 3 seconds, always naming its data source and confidence. If everything else fails, a person in India must still be able to see the verdict and know why.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Place search (India-only type-ahead) and use-my-location, with friendly labels
- [ ] Live assessment from `/api/assess`: current PM2.5 with source badge (station name/distance/age or model estimate) and confidence chip
- [ ] Verdict with Today/Tomorrow tabs, top-2 reasons, per the verdict matrix (§7.2), unit-tested at every category boundary
- [ ] 48-hour PM2.5 forecast chart with category bands, now marker, night shading, keyboard-accessible points
- [ ] Best-window: cleanest 3-hour daytime block with % improvement (hidden under 15%; tip suppressed when window itself is Poor+)
- [ ] Rule-driven tip checklist (max 5, priority-ordered, each citing the value that triggered it)
- [ ] Weather strip, provenance footer, Standard/Sensitive toggle (instant recompute, persisted locally)
- [ ] Fail-soft states: per-section ok / stale / unavailable; no mock data ever; retry on total failure
- [ ] AWS deployment: Amplify Hosting SPA + Lambda (Hono) Function URL via SAM; CloudWatch logs
- [ ] Accessibility: WCAG AA, aria-live verdict, reduced motion, Lighthouse a11y ≥ 90
- [ ] Share card (1080×1350 PNG) with deep link; saved places (≤5, localStorage); about/data-sources sheet
- [ ] (P2, only if time remains) NASA FIRMS fire-detection heuristic panel; server-rendered OG link preview

### Out of Scope

- Accounts, logins, roles — no profile exists; the one preference (Sensitive) is device-local
- A database — state lives in the URL and localStorage (ADR-0002)
- Push notifications — 48h build; alerts need scheduling infra
- AI features — event rules say list AI tools used, not ship AI (prospect after event)
- Sub-kilometre modelling — CAMS is ~45 km; Breeze labels itself regional and never claims street-level truth
- Indoor air sensing, medical advice — footer says "General guidance, not medical advice"
- Locations outside India — India bounding box only; out-of-range shows "Breeze covers India"
- Native apps — responsive web only
- Cross-device saved places / short links / stored snapshots — requires persistence (prospect)

## Context

- **Event:** WeMakeDevs × AWS Environmental Hacks, Track 01 (Air). Solo builder. New repository started 9 Oct 2026; originality rules — Aerate and Calm are reference only, no code copied.
- **Domain docs:** `PRD.md` (v1.0, full spec incl. FR-01…FR-19, decision logic §7, API contract §12, delivery plan §18), `CONTEXT.md` (domain glossary), `docs/adr/` (0001, 0002).
- **Data sources:** Open-Meteo Geocoding + Air Quality (CAMS) + Forecast, OpenAQ v3 (station PM2.5, free key), BigDataCloud reverse geocode, NASA FIRMS (P2). Day-one live verifications in PRD §8: OpenAQ bbox param order, station coverage across city tiers, FIRMS limits, rate limits, service terms.
- **Architecture:** React SPA (Vite + Tailwind + TanStack Query) on Amplify; Hono/TypeScript Lambda behind a Function URL; shared pure-TS `@breeze/core` computes verdict/window/tips in the browser (ADR-0001); in-memory TTL cache; SAM for deploys.
- **Known sharp edges:** Open-Meteo time strings are location-local wall clock (never Date-parse in browser tz); CAMS ~45 km / 3-hourly; OpenAQ coverage sparse in small towns (model estimate is honesty, not a bug); iOS Safari share-capture quirks.

## Constraints

- **Timeline:** ~48 hours (Fri 9 Oct evening → Sun 11 Oct afternoon). Hard cut rule: no public URL by Sat 6 PM ⇒ drop P1 and P2 entirely.
- **Tech stack:** React + TypeScript (Vite), Tailwind, TanStack Query, Hono on Node.js 22 (Lambda arm64), zod, AWS SAM + Amplify Hosting. Chosen for speed, free-tier fit, and one shared core package. (PRD §10)
- **Performance:** verdict visible < 3 s warm on 4G; API p95 ≤ 2.5 s warm / 5 s cold; initial JS < 200 KB gzipped; Lighthouse mobile ≥ 90.
- **Data honesty:** 100% live data; no fixtures or mock data in the product; every number carries source + timestamp; missing data is shown as missing (fail soft, never fake).
- **Privacy/security:** no accounts or analytics; coordinates rounded to 2 dp; logs at 1 dp; keys only in Lambda env; CORS allow-list; budget alert ~USD 5.
- **Budget:** free-tier-friendly only (Lambda Function URL, Amplify static hosting, key-free upstreams where possible).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PM2.5 category bands are half-open continuous intervals — [0,30], (30,60], (60,90], (90,120], (120,250], (250,∞), never rounded first | CPCB's integer table leaves gaps for fractional readings; linear sub-index interpolation requires a continuous scale | ✓ Good (grilling Q1) |
| Zero air data ⇒ explicit "Can't assess right now" card with Retry — no verdict word, colour, or client-side fallback | Fail soft, never fake; a client-cached verdict could be days old | ✓ Good (grilling Q2) |
| All day boundaries (Today/Tomorrow, daytime mean, window restriction) use the location's local timezone | The verdict is about the place; sunrise/sunset/UV/forecast hours are already local | ✓ Good (grilling Q3) |
| `stale` means cache-fallback-only (with ageMin); an old-but-freshly-fetched measurement is `ok` | Keeps "is this live?" separate from "how old is the measurement?" (badge + confidence) | ✓ Good (grilling Q4) |
| Station and model paths degrade per feature: station-only kills chart/window/Tomorrow; model-only is the FR-05 happy path | Follows fail-soft; response contract already separates `air.current` from `air.model` | ✓ Good (grilling Q5) |
| Best-window chip always renders when ≥15% rule passes; tip A3 suppressed when window mean ≥ 91 µg/m³ | "Go out between…" must never read as an invitation into Poor air | ✓ Good (grilling Q6) |
| Decision logic (category, verdict, window, tips) runs in the browser via shared `@breeze/core` | Instant Sensitive toggle with no refetch; one tested implementation shared with share card | ✓ Good (ADR-0001) |
| No database: place in URL, profile + saved places in localStorage (`{lat,lon,label}`, ≤5) | Shareable-by-construction links, zero cost, trivial privacy; no cross-device sync | ✓ Good (ADR-0002) |
| Share disabled when no verdict exists; card "As of" stamped from `measuredAt`, includes source label | A snapshot shared in a family group must not outdate silently | ✓ Good (grilling Q9) |
| Offline reuses the in-memory query cache only; cold offline load = error + Retry | Avoids first write-path for stored results; keeps fail-soft line clean | ✓ Good (grilling Q10) |
| Tiering: P0 (MVP) by Sat 6 PM, P1 (share card/deep link/saved places) Sun AM, P2 (FIRMS, OG preview) only if time remains | Hard 48h constraint; cut rule protects the public URL | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-11 after initialization*
