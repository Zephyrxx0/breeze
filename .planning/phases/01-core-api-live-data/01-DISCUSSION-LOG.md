# Phase 1: Core, API & Live Data - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-11
**Phase:** 1-Core, API & Live Data
**Areas discussed:** Verdict & reasons voice, Tomorrow tab derivation, Smoke scope & fail bar, Scaffold & tooling

---

## Verdict & reasons voice

| Option | Description | Selected |
|--------|-------------|----------|
| Number-first | Line 1 leads with effective PM2.5 + category + source; line 2 adds Sensitive-profile context only | ✓ |
| Human-first sentences | Lead with plain-language impact ("The air is unhealthy right now"); number lives only in the reading display | |
| Emit 3 lines, UI picks | Core emits more lines than shown; Phase 2 chooses | |

**User's choice:** Number-first
**Notes:** Matches the glossary's "Effective PM2.5" concept — the number and its source are the reason.

| Option | Description | Selected |
|--------|-------------|----------|
| Extras replace line 2 | Trend / station-vs-model extras replace line 2; line 1 never displaced; exactly 2 lines | ✓ |
| Show up to 4 lines | Base 2 always show; extras append as lines 3–4 | |
| Extras replace both | Only extras show when they fire | |

**User's choice:** Extras replace line 2
**Notes:** Keeps the verdict card layout stable and honors the PRD's "top-2 reasons" wording.

| Option | Description | Selected |
|--------|-------------|----------|
| Prefix cite, verbatim text | Triggering value prefixed to PRD §7.5 tip text verbatim | ✓ |
| Cite chip + short tip | Cite chip + shortened imperative text | |
| No inline cite | PRD text as-is, triggering value shown elsewhere | |

**User's choice:** Prefix cite, verbatim text
**Notes:** Satisfies DEC-03 without rewriting 9 rules × 2 profiles of copy.

| Option | Description | Selected |
|--------|-------------|----------|
| Core emits strings | @breeze/core returns final ready-to-render strings; UI + share card render verbatim | ✓ |
| Core emits facts, UI words them | Structured facts from core, string mapping in UI | |

**User's choice:** Core emits strings
**Notes:** One tested implementation of the exact words users see; i18n (PRSP-04) is v2 and accepts a core change.

---

## Tomorrow tab derivation

| Option | Description | Selected |
|--------|-------------|----------|
| Mean only, peak as reason | Verdict from daytime (06:00–20:00 local) mean via the matrix; peak gets its own reason line | ✓ |
| Worst of mean and peak | Worse category of the two wins the verdict | |
| Mean + peak-warning reason | Mean verdict with a "getting worse" style extra when peak crosses a category | |

**User's choice:** Mean only, peak as reason
**Notes:** Deterministic, one input per verdict, unit-testable at boundaries.

| Option | Description | Selected |
|--------|-------------|----------|
| Worst hour of full day | Peak = worst hour across all 24 h of Tomorrow (local) | ✓ |
| Worst hour of daytime only | Peak restricted to 06:00–20:00 | |
| Both peaks | Daytime peak and night peak reasons | |

**User's choice:** Worst hour of full day
**Notes:** Hides nothing — an evening spike is the common Indian pollution pattern and must be warn-able.

| Option | Description | Selected |
|--------|-------------|----------|
| Extras are Today-only | Trend and station-vs-model extras anchored to "now"; never on Tomorrow | ✓ |
| Try both tabs | Compute extras for Tomorrow too (degenerates — stations have no forecast) | |

**User's choice:** Extras are Today-only
**Notes:** Avoids misleading statements; Tomorrow's line 2 is always the peak reason.

---

## Smoke scope & fail bar

| Option | Description | Selected |
|--------|-------------|----------|
| 4 places: 2 metro + tier-2 + small | Delhi, Bengaluru/Pune, Jaipur/Lucknow, small town (Jaisalmer/Bulandshahr) | ✓ |
| Full 12-place script now | PRD §17 script at Phase 1 exit | |
| 3 places minimum | Bare success-criteria minimum | |

**User's choice:** 4 places: 2 metro + tier-2 + small
**Notes:** Full 12-place script remains the Phase 3 pre-deploy gate.

| Option | Description | Selected |
|--------|-------------|----------|
| Coverage-independent bar | Schema-valid 200 + some effective PM2.5 per place; zero stations in small town expected; OpenAQ failing all places or Open-Meteo failing anywhere = blocker | ✓ |
| Require station hit in metros | Treat zero metro stations as an integration bug | |
| Shape-only gate | Schema validity alone; mix only reported | |

**User's choice:** Coverage-independent bar
**Notes:** Catches integration bugs without punishing honest coverage sparsity.

| Option | Description | Selected |
|--------|-------------|----------|
| I'll provide keys | User provides OpenAQ key (+ FIRMS MAP_KEY for P2) in .env; Lambda env at deploy | ✓ |
| Tolerate missing key locally | Station path reports unavailable without a key | |

**User's choice:** I'll provide keys
**Notes:** No key-less/mock mode ever built — consistent with the data-honesty constraint.

---

## Scaffold & tooling

| Option | Description | Selected |
|--------|-------------|----------|
| pnpm workspaces | pnpm-workspace.yaml, apps/* + packages/*; user preference + pinned STACK.md | ✓ |
| npm workspaces per PRD | PRD §10 wording | |

**User's choice:** pnpm workspaces
**Notes:** PRD §10's "npm workspaces" wording loses to the user's pinned research and global preference.

| Option | Description | Selected |
|--------|-------------|----------|
| core+api real, web shell | Full core + api; minimal Vite+React shell for web | ✓ |
| core+api only | No web workspace until Phase 2 | |
| Full tree now | PRD §11 tree with empty component dirs | |

**User's choice:** core+api real, web shell
**Notes:** Proves ADR-0001's browser-import assumption in Phase 1 instead of mid-Phase-2.

| Option | Description | Selected |
|--------|-------------|----------|
| Root scripts: dev/smoke/test | Single pnpm dev (:8787 + core watch), pnpm smoke, pnpm test | ✓ |
| Per-workspace commands | pnpm --filter per workspace | |

**User's choice:** Root scripts: dev/smoke/test
**Notes:** One terminal for the 48-hour sprint.

---

## the agent's Discretion

No explicit "you decide" answers. Agent retains flexibility on: multi-trigger tip cite ordering, internal file layout, exact tier-2/small-town picks within the suggested pairs, structured-log field names, zod schema internals.

## Deferred Ideas

None raised during discussion. Known-but-out-of-scope: full 12-place smoke (Phase 3), FIRMS panel (P2/v2), i18n of core strings (PRSP-04).
