# Feature Research

**Domain:** Air-quality go / no-go decision apps (India, consumer web)
**Researched:** 2026-10-11
**Confidence:** MEDIUM

> Research method note: `gsd-tools query research-plan` seam unavailable in this
> environment (`gsd-tools not found`), so sources were gathered via built-in
> websearch / webfetch — i.e. the `websearch` provider tier (MEDIUM). One expert
> round-up (BreatheSafeAir, updated Aug 2026), app-store listings, CPCB/SAFAR
> official pages, and India press coverage of the IQAir-vs-SAMEER trust gap were
> the primary evidence. No direct hands-on testing of competitor apps and no
> user interviews — treat market-level claims as MEDIUM, PRD-internal claims as HIGH.

## Feature Landscape

Scope anchor: PRD.md §5–7 tiers (P0/P1/P2) are fixed. This research validates
that P0 is true table stakes, flags what P0 is missing, and marks what to
deliberately not build in a 48-hour solo hackathon.

### Table Stakes (Users Expect These)

Features every credible AQI app already has. Users give no credit for having
them and punish hard for missing them.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Current reading with category + colour **and** text | AirVisual, Sameer, SAFAR, Plume, Haze, aqi.in all lead with a big number + colour. Without it there is no product. | LOW | **P0 ✓ (FR-05).** CPCB six bands with half-open intervals. Colour must never be the only signal (FR-14) — this is also an a11y requirement. |
| A plain-language "what should I do" health advisory | Every competitor translates the number into advice: AirMatters has a health-advice section, Haze recommends mask/purifier/window-open by level, Plume recommends for/against exercise, CPCB Sameer posts "children: reduce heavy exertion, wear N95" guidance | LOW | **P0 ✓ (FR-06 verdict + FR-10 tips).** This is the actual product — a number without an action is the gap the PRD §2 identifies. Breeze is differentiated only in *tying each tip to the triggering value*, not in having tips at all. |
| Forecast (next 24–48 h) | AirVisual, Plume, AirMatters, SAFAR all forecast; "will it get worse by evening" is the second question every user asks | MEDIUM | **P0 ✓ (FR-07).** 48 h SVG chart with bands/now-marker is the single most complex P0 UI component — budget accordingly. |
| Place search / city selection | Universal. Sameer is city-list based; AirVisual combines search + saved locations | LOW–MEDIUM | **P0 ✓ (FR-01).** India-only type-ahead is a *tighter* constraint than competitors, which is fine. Empty state must ship the popular-city shortcuts (PRD §14) or the first screen is a bare input box. |
| Use-my-location | Table stakes for "right now, here" products; AirVisual and BreezoMeter default to it | LOW | **P0 ✓ (FR-02).** Permission only on tap, 8 s timeout, graceful deny → focus search. Deny is the *common* path on Indian Android (permission fatigue), so the search fallback must be excellent, not an afterthought. |
| Fast, lightweight load on a low-end Android phone | India is a 360 px / low-RAM / patchy-4G market; studies on low-bandwidth Indian web apps repeatedly show 2G/3G drops and budget devices as the norm. Slow = closed, never returned | MEDIUM | **P0 ✓ via NFRs** (verdict < 3 s warm 4G, JS < 200 KB gzipped, Lighthouse ≥ 90). Not an FR — it is a cross-cutting acceptance gate. Test on a real phone over mobile data (PRD §13 step 5). |
| Timestamps / "when was this measured" | Users in India have been burned by stale official data (see: SAMEER data-blackout coverage). An undated number is distrusted | LOW | **P0 ✓ (FR-12).** Attribution is also legally required: CAMS/Open-Meteo is CC BY 4.0. |
| Failure honesty — no invented numbers | A fabricated value in a health-adjacent product is a disqualifier, not a bug | MEDIUM | **P0 ✓ (FR-13).** Per-section ok/stale/unavailable, retry on total failure. This is a *principle* that touches every component — treat as an architectural invariant, not a feature ticket. |
| Share to WhatsApp (link at minimum) | The PRD's own persona #4 is "family group member receives a card on WhatsApp". AQI numbers circulate in Indian WhatsApp groups constantly; screenshots are the current default mechanism | LOW (link) / MEDIUM (PNG card) | **P1 (FR-15/16).** ⚠️ See gap analysis below — a bare unfurled link is *near*-table-stakes for this product's primary distribution channel; the PNG card is the differentiator. |
| Sensitive-group guidance (children, elderly, asthma) | CPCB advisories are explicitly stratified by sensitive groups; AirLief built its whole product on it. An app that advises identically for an asthma patient and a healthy adult feels wrong | LOW | **P0 ✓ (FR-09 toggle + stricter matrix).** Breeze's device-local toggle is the *lightweight* version of AirLief's questionnaire onboarding — no form, no account, instant recompute. Keep it a binary switch; a multi-question profile is scope creep. |
| Units on every number | Regulatory expectation (µg/m³) and trust signal | LOW | **P0 ✓ (copy rules §14).** |
| Accessibility: contrast, keyboard, screen reader, reduced motion | App-store review hygiene and judging criterion "Design and usability" | MEDIUM | **P0 ✓ (FR-14).** aria-live verdict + colour-never-alone are the two that actually matter. |

### Differentiators (Competitive Advantage)

Not expected by users; these are where Breeze wins. Aligned with Core Value
("one honest, actionable verdict … always naming its data source").

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Verdict-first screen** (Good to go / Take care / Stay indoors) instead of a number | Every competitor — including Sameer, SAFAR, AirVisual — opens on a *value*. The decision is left to the user. This is Breeze's central thesis and it maps directly to judging criterion "Idea and Impact" | LOW | **P0 ✓.** The three-word verdict + top-2 reasons is the cheapest and most defensible differentiator in the whole spec. |
| **Provenance badge: station (name/distance/age) vs "model estimate (~45 km)" + High/Medium/Low confidence chip** | No consumer AQI app does this clearly. India has a *documented* trust crisis: press coverage repeatedly shows IQAir reporting 700+ while SAMEER showed <300 for the same day, plus stories of SAMEER going silent. Users know something is off; nobody explains *which number is which* | MEDIUM | **P0 ✓ (FR-05/12 + §7.3).** Second-most defensible differentiator. The station-vs-model ratio reason line ("local station reads much higher than the regional model") is genuine insight no competitor surfaces. |
| **Cleanest 3-hour window** ("go out between 4–7 PM, ~35% lower") | Plume recommends *against* activity; nobody in the Indian market offers a positive, quantified *when to go* window. It converts forecast data into a decision | LOW | **P0 ✓ (FR-08).** The ≥15 % suppression rule and Poor-window tip suppression are correct — an invitation into Poor air is a credibility killer. |
| **Tip citing its trigger** ("Wear an N95 — PM2.5 is 94 µg/m³") | Competitors show generic advice text with no connection to the reading; AirMatters/Haze advice can contradict the number on screen | LOW | **P0 ✓ (FR-10).** Each tip's "why" line is what makes the checklist feel computed rather than canned. |
| **Shareable 1080×1350 verdict card** | No major AQI app has a designed share artifact; Indian users currently screenshot. A branded card travels better in WhatsApp groups and doubles as marketing for the hackathon demo | MEDIUM | **P1 (FR-15).** html-to-image has real iOS Safari quirks (fonts.ready, double render) — P1 placement is right, but it is the demo-video hero shot (storyboard step 4), so schedule it Sunday morning, not Sunday noon. |
| **Deep link that always loads live data** (`/?lat&lon&n`) | A shared link that shows *today's* verdict (not a stale snapshot) is rare; stateless design makes it free | LOW | **P1 (FR-16)** — but nearly free given ADR-0002 (place in URL). Corrects the classic failure: "link opened a day later shows old data." |
| **Standard/Sensitive instant toggle with zero refetch** | AirLief personalises via a questionnaire; Breeze does it in one tap, offline-capable, no data leaves the device | LOW | **P0 ✓ (FR-09).** Only possible because verdict logic is client-side in `@breeze/core` (ADR-0001) — the architecture *is* the differentiator. |
| **NASA FIRMS upwind fire heuristic** | Unique to Indian context (stubble-burning discourse) in this app class; strong demo narrative | MEDIUM | **P2 (FR-18).** Correctly gated. Wording discipline ("fire detections", "indication") is mandatory — calling it "stubble burning" would be factually wrong (FIRMS sees all thermal anomalies) and a judging liability. |
| **OG link preview so WhatsApp unfurls the verdict** | Turns every shared link into a mini verdict card even without PNG capture | MEDIUM–HIGH | **P2 (FR-19).** Server-rendered HTML + image adds a rendering dependency; conflicts with "no verdict on the server" only superficially (shared `@breeze/core` makes it legal). Correctly deferred — plain links still work. |

**Honest read on differentiation:** Breeze does not beat incumbents on data
breadth (AirVisual has 6 pollutants, maps, widgets, worldwide coverage) and
never should try in 48 hours. It wins on *decision*, *provenance* and *share*.
Three pillars, everything else is support.

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Six-pollutant dashboard (NO₂, SO₂, O₃, CO)** | Every competitor shows them; feels "more complete" | India's health story is PM2.5; half the pollutants are unmonitored outside metros (same coverage gap as stations); adds visual noise to a *decision* product and dilutes the verdict-first screen | PM2.5 is the product. 💡 *Freebie:* Open-Meteo response already fetches `pm10` (PRD §8 #2) — if time remains, one muted "PM10 82 µg/m³" line is LOW cost. Do not build a pollutant breakdown UI. |
| **Map view of stations** | Plume/AQICN/AirMatters all have maps; visually impressive | HIGH complexity (tiles, clustering, perf on low-end devices), bundle-budget killer, and it reverts the user to *interpreting* rather than deciding — the exact problem Breeze solves | The verdict + chart already answer "what should I do". Map goes to prospects (§20). |
| **Push notifications / morning AQI alert** | "Tell me when it's bad" is the #1 intuitive ask | Needs scheduling infra (EventBridge + delivery channel), permission UX, and a server-side verdict — three hard dependencies the PRD already excludes. Alerts with wrong thresholds train users to ignore them | Deep link + saved places covers the 10-second check. Post-event prospect (§20 alerts). |
| **Accounts, profiles, sync** | Users ask to "save my places across devices" | A DB, auth, privacy surface, and cold-start friction — for a 48-hour build it is a project-killer. Also conflicts with "no accounts, no analytics" privacy stance, which is a *selling point* | localStorage (≤5 chips) + URL state. Explicitly out of scope; re-audit only if multi-user features ever exist (§20). |
| **AI-generated advisories / chatbot ("Can I run tomorrow?")** | Event tracks like AI features; feels modern | Event rules require *listing* AI tools, not shipping AI; hallucinated health advice in a trust-branded product is catastrophic; latency on 4G | Deterministic rule table (§7.5) — reproducible, unit-testable, instant. Prospect (§20). |
| **Hindi / regional language UI *this version*** | Legitimately expected — Sameer and SAFAR both offer Hindi; the target audience includes non-English speakers | Retrofitting i18n under deadline produces half-translated UIs (worse than none) and collides with the Saturday-6 PM cut rule | **Note as the single biggest acknowledged gap.** Cheap insurance *if caught early*: keep all copy as string constants (PRD §14 copy rules already imply this) so a post-event localisation pass is mechanical. Static strings first, model-generated text later (§20). |
| **Ads / subscriptions** | Competitor norm (Haze, Air Matters, Check Air Quality all monetise this way) | Destroys the clean demo, adds third-party scripts that blow the JS budget and 4G load target, and contradicts "no analytics" | Breeze has no monetisation goal. Zero ads is itself a quiet differentiator (AirVisual earns praise for exactly this). |
| **AR "see the particles" / gamification / streaks** | Haze shipped AR view; engagement gimmicks get press | Hype features read as unserious in a health-adjacent judging context and cost days, not hours | Verdict card motion (the slow wave, disabled under reduced motion) is the entire motion budget. |
| **Historical trends, yearly averages, exposure tracking** | Plume shows best/worst days of year; BreezoMeter shows "my exposure" | Needs stored history or backfill requests (past_days) Breeze doesn't fetch; "your exposure today" needs continuous tracking = accounts + background location | 48 h forward-looking forecast only. History is a §20 "better data" prospect. |
| **Live map of fire detections (FIRMS raw overlay)** | Visually the most "hackathon" feature | Raw thermal anomalies ≠ smoke; a map invites the "stubble burning" misreading the PRD explicitly guards against | P2 heuristic panel with count + distance + bearing, labelled "indication, not measurement". |
| **Claiming street-level accuracy / "AQI for your pin code"** | Users believe it and ask for it | CAMS is ~45 km; OpenAQ coverage is sparse in small towns. A wrong hyperlocal claim is the fastest way to lose the trust that is Breeze's whole moat | Never: label station vs model, show confidence, say "regional estimate". Already a Key Decision. |
| **Being an "AQI" app by name/label** | Users literally search "AQI"; CPCB conventions train everyone to think in AQI | ⚠️ *Tension to manage, not a feature:* Breeze correctly refuses the word "AQI" (NAQI is 24-hour; Breeze classifies current/hourly values). But users arriving from Sameer/Google expect "AQI" — a total vocabulary blackout can read as evasive | Not a build item. Copy suggestion: keep "PM2.5 category" but state *once* in the about sheet: "the bands are CPCB's AQI bands applied to the current reading" — bridges expectation without making the false claim. |

## Feature Dependencies

```
[Open-Meteo/OpenAQ upstreams]
    └──requires──> [/api/assess normalisation + per-source status]
                       └──requires──> [Effective PM2.5 (§7.3 station-vs-model)]
                                          ├──requires──> [PM2.5 category (§7.1)]
                                          │                  ├──requires──> [Verdict matrix (§7.2)]
                                          │                  │                  └──requires──> [Sensitive toggle]
                                          │                  └──requires──> [Tip rules (§7.5)]
                                          └──requires──> [Source badge + confidence chip]

[48 h forecast hourly series]
    ├──requires──> [ForecastChart]
    ├──requires──> [Best Window] ──enhances──> [Tip A3]
    ├──requires──> [Tomorrow tab (daytime mean)]
    └──requires──> [Reason: "getting worse by evening"]

[Deep link / URL state] ──requires──> [Place concept (lat, lon, label)]
[Share card PNG] ──requires──> [Verdict + Tips + Place label + self-hosted fonts]
[Share card PNG] ──enhances──> [Deep link] (card carries the URL)
[OG preview (P2)] ──requires──> [Deep link route + shared @breeze/core on server]
[Saved places] ──requires──> [Place concept + localStorage]
[Provenance footer] ──requires──> [per-source status from /api/assess]
[Weather strip] ──requires──> [weather section status only — must degrade alone]
[PM10 line (optional)] ──requires──> [already-fetched pm10 series] (no new upstream call)

[Offline persistence / stored snapshots] ──conflicts──> [ADR-0002 no-database invariant]
[Accounts/sync] ──conflicts──> [privacy stance + 48h cut rule]
[Push alerts] ──conflicts──> [P0 timeline + no-server-verdict principle]
[Hindi i18n retrofit] ──conflicts──> [Saturday 6 PM cut rule if attempted mid-build]
```

### Dependency Notes

- **Verdict requires category requires effective PM2.5:** the §7.3
  station-vs-model selection is the true root of the whole decision tree. Get
  `/api/assess` + `@breeze/core` (category/verdict/window/tips) tested *first* —
  PRD §18 already puts this Friday-night/Saturday-morning, which is correct.
- **Sensitive toggle requires verdict + tips to be pure functions:** the
  instant-recompute differentiator only exists because of ADR-0001 (logic in
  browser). Any verdict logic accidentally written in the Lambda breaks it.
- **Tip A3 requires Best Window:** ordering dependency inside the tip table —
  bestWindow() must run before buildTips().
- **Share card requires the deep link to already be meaningful:** card prints
  the URL, so FR-16 should land with or before FR-15.
- **Weather strip and chart must degrade independently:** per-section status
  (FR-04/13) means weather being `unavailable` can never blank the verdict —
  this is the dependency *anti-pattern* to test for.
- **OG preview conflicts with nothing architecturally** (shared core) but
  conflicts with the *timeline*: it is the last item for good reason.

## MVP Definition

### Launch With (v1) — i.e. PRD P0, validated as correct

- [ ] **Verdict card with Today/Tomorrow + reasons** — the product; without it
  Breeze is a prettier Sameer
- [ ] **Current PM2.5 with source badge + confidence chip** — the trust moat;
  India's documented IQAir-vs-SAMEER confusion is the gap this fills
- [ ] **Place search + use-my-location with deny-fallback** — entry paths; the
  deny path is the common one on target devices
- [ ] **48 h forecast chart with bands** — answers "is it getting worse" —
  highest-complexity P0 item; start it with the earliest UI milestone
- [ ] **Best window with ≥15 % rule** — the one feature users will screenshot
  *without* being asked
- [ ] **Rule-driven tips citing their trigger value** — converts data to action
- [ ] **Sensitive toggle (instant, local)** — sensitive-group guidance without
  a profile
- [ ] **Weather strip, provenance footer, per-section fail-soft states** —
  trust and robustness; also CC BY attribution compliance
- [ ] **Performance + a11y gates** (3 s verdict, <200 KB, Lighthouse ≥ 90,
  aria-live) — not features but acceptance criteria; a slow or inaudible
  verdict fails table stakes
- [ ] **AWS public URL by Saturday 6 PM** — cut rule protects everything above

### Add After Validation (v1.x) — PRD P1

- [ ] **Share card PNG + deep link** — the WhatsApp distribution channel; near
  table-stakes *for this product's personas* — if only one P1 item survives,
  it is this (ship at minimum: copy-link + deep link work)
- [ ] **Saved places (≤5 localStorage)** — cheap retention mechanic; expected
  by AirVisual/AirMatters users but genuinely optional on a URL-state web app
- [ ] **About / data-sources sheet** — where the "these are CPCB's bands"
  bridge copy lives (see anti-feature note on AQI vocabulary)

### Future Consideration (v2+) — PRD P2 / §20 prospects

- [ ] **FIRMS fire heuristic (P2)** — only if P0+P1 deployed and video unblocked
- [ ] **OG link preview (P2)** — WhatsApp unfurl polish
- [ ] **Hindi + regional languages** — the biggest acknowledged product gap;
  do as *static string externalisation* post-event, before any AI-generated text
- [ ] **Alerts / push, map view, accounts, AI advisories, history** — all
  anti-features for this build; §20 prospects only
- [ ] **PM10 line** — free opportunism: value already fetched, LOW cost, do it
  only if every P0/P1 item is already green

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Verdict card + reasons | HIGH | LOW | P1 |
| Current reading + source badge + confidence | HIGH | MEDIUM | P1 |
| Place search + geolocation | HIGH | MEDIUM | P1 |
| Fail-soft states / no-fake-data invariant | HIGH | MEDIUM | P1 |
| Performance + a11y gates | HIGH | MEDIUM | P1 |
| 48 h forecast chart | HIGH | HIGH | P1 |
| Sensitive toggle | MEDIUM–HIGH | LOW | P1 |
| Tips with trigger values | HIGH | LOW | P1 |
| Best window | MEDIUM–HIGH | LOW | P1 |
| Weather strip | MEDIUM | LOW | P1 |
| Provenance footer / timestamps | HIGH | LOW | P1 |
| Share card PNG | HIGH (distribution) | MEDIUM | P2 |
| Deep link / copy link | HIGH | LOW | P2 |
| Saved places | MEDIUM | LOW | P2 |
| About / data-sources sheet | MEDIUM | LOW | P2 |
| PM10 line | LOW–MEDIUM | LOW | P3 |
| FIRMS fire panel | MEDIUM | MEDIUM | P3 |
| OG link preview | MEDIUM | HIGH | P3 |
| Hindi / regional UI | HIGH (post-event) | MEDIUM | P3 |
| Map view | MEDIUM | HIGH | P3 (never this build) |
| Push alerts | HIGH (intuitive ask) | HIGH | P3 (never this build) |
| Accounts / sync | MEDIUM | HIGH | P3 (never this build) |
| Six-pollutant breakdown | LOW | MEDIUM | P3 (never this build) |

**Priority key:** P1 = must have for launch (PRD P0); P2 = should have (PRD P1);
P3 = nice to have / future / deliberately excluded.

## Competitor Feature Analysis

| Feature | IQAir AirVisual | CPCB SAMEER / SAFAR | Plume Labs | AirMatters | AirLief | Breeze Approach |
|---------|-----------------|---------------------|------------|------------|---------|-----------------|
| Leading number vs verdict | Number (AQI) | Number (AQI) | Number | Number | Number | **Verdict first** — only decision-first design in the set |
| Health advice | Minimal | Generic advisory text | Activity for/against | Dedicated advice section | Personalised tips | P0, rule-driven, each tip cites its trigger value |
| Sensitive-group handling | None | Text advisories | None | None | Questionnaire profile | Binary device-local toggle, instant recompute |
| Forecast | Yes | Hourly | Yes (history too) | Yes | No | 48 h chart + cleanest 3 h window (unique) |
| Station vs model provenance | Not surfaced | Implicitly station-only; no explanation of gaps | Not surfaced | Not surfaced | Not surfaced | **Explicit badge + distance + age + confidence chip** — white space |
| Saved locations | Yes (multi-city) | City list | Yes | Yes | Favourites | ≤5 localStorage chips (P1) |
| Sharing | Link/map share | Screenshot culture | Screenshot culture | Screenshot culture | None | Designed 1080×1350 PNG card + live deep link (P1) |
| Ads | None (praised for it) | None | None | Mild ads | None | None |
| Languages | Global multi-language | Hindi + English | English-first | English-first | English | English only this version — flagged as the key gap |
| Maps / multi-pollutant / widgets | Yes | Map on site | Yes | Widgets, pollen | Minimal | Deliberately excluded (anti-features) |

**Read:** incumbents compete on *breadth of data*; Breeze competes on
*clarity of decision* + *honesty of source* + *shareability*. The table's
"Breeze Approach" column is the entire product.

## Gaps Identified vs PRD P0

| Gap | Severity | Recommendation |
|-----|----------|----------------|
| Copy-link affordance sits in P1 (FR-15/16) while persona #4 is a WhatsApp group member | MEDIUM | If P1 is at risk, "copy link" alone is the floor — it's LOW cost and the URL is already state. PNG card may slip; the link must not. |
| No FR for empty-state popular-city shortcuts (only §14 prose) | LOW | Promote to an explicit acceptance item — first-screen quality on a cold open is what the demo shows. |
| "AQI" vocabulary expectation vs "PM2.5 category" label | MEDIUM (trust/UX) | Bridge line in the about sheet ("CPCB's bands applied to the current reading"). No code impact, wording decision only. |
| Hindi/regional out of scope | HIGH (product), accepted (scope) | Document as known gap; keep copy in string constants now so post-event localisation is mechanical. |
| `pm10` fetched but never displayed | LOW | Optional one-line display; zero extra upstream cost. Only when everything else is green. |
| Dark mode: tokens declared (§14 system theme) but no FR | LOW | `prefers-color-scheme` via Tailwind dark: is ~free; include in a11y/polish pass. |
| Offline cold-load = error (Key Decision Q10) | LOW | Correct for scope; just ensure the error copy tells users to retry when back online, so it doesn't read as a broken app. |

## Sources

- BreatheSafeAir, "10+ Best Air Quality Apps and AQI Apps in 2026"
  (breathesafeair.com/best-aqi-apps/, published 2023, updated 8 Aug 2026) —
  hands-on round-up of 10+ apps; primary competitor feature evidence. MEDIUM.
- CPCB SAMEER app listings — Google Play / Apple App Store (hourly CPCB NAQI
  updates, city list, Hindi advisory content via CPCB social channels). MEDIUM.
- SAFAR-India (safar.tropmet.res.in, IITM/MoES) — official Indian forecast
  service feature set. MEDIUM.
- IQAir AirVisual product pages + App Store notes (saved locations, widgets,
  multi-pollutant). MEDIUM.
- India press coverage of IQAir-vs-SAMEER discrepancies (LinkedIn/Instagram
  news posts, News9 "Inside India's Air Data Blackouts") — evidence for the
  provenance-trust gap. MEDIUM.
- Low-bandwidth India mobile studies (ICSEA 2025 paper, rural-India web
  optimisation journal, Axway/Sigmato engineering blogs) — performance-as-table-
  stakes rationale. LOW–MEDIUM.
- PRD.md §5–7, §14, §20 and CONTEXT.md — internal, HIGH (self-consistency
  check of tiers against this research).

---
*Feature research for: Breeze — air-quality go/no-go decision app (India)*
*Researched: 2026-10-11 · Confidence: MEDIUM (websearch-tier sources; no hands-on competitor testing)*
