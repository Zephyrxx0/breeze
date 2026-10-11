---
quick_id: 261011-tpt
status: complete
---

# Summary — UI/UX overhaul

## Delivered
- New design system (light/dark tokens, Figtree + Instrument Serif self-hosted, verdict-tinted ambient background).
- Landing page at `/` with CTA to `/app`; `/?lat&lon` share links still open the app.
- Dashboard redesign: verdict hero with CPCB scale, Bklit 48 h area chart (bands, night, NOW, best-window highlight, hover + keyboard scrub), tip icons, weather, provenance, offline banner, saved places, combobox search with no-results message.
- react-simple-maps India map (welcome state + "Around India" card) using one keyless Open-Meteo multi-point call.
- Share card rebuilt (1080×1350) with the real place name and host.

## PRD gaps / bugs found and fixed
- Weather strip and tips used hourly[0] (local midnight) as "now"; UV max rendered NaN; humidity read the wrong key.
- Confidence never reached "High" (station age not passed); "getting worse by evening" and station-vs-model ratio reason lines never fired.
- Share card had no place name (read nonexistent `location.name`) and a fabricated domain.
- Station age fell back to an invented "15m".
- Missing: popular-city empty state, dark mode, offline state, best-window highlight on chart, no-results message, self-hosted fonts, meta/OG/favicon.

## Verification
- `pnpm vitest run`: 19 files, 99 tests green (also under TZ=UTC and Asia/Kolkata).
- Initial JS 137.7 KB gz (budget 200); chart + map deferred (128 KB gz).
- Visual check via headless Chromium: landing, welcome, dashboard (light/dark, desktop/mobile), share card.

## Not done / needs owner
- Production Lambda has no OPENAQ_API_KEY (`openaq: unavailable — no key`), so every place shows "model estimate". Redeploy with the key to get station readings.
- Server `weather.current` still mirrors hourly[0]; UI no longer uses it. Fix on next API deploy.
- Not deployed; not committed.

## Follow-up (same session)
- School day planner (sensitive thresholds for children), QR noticeboard poster (no air numbers printed), PWA offline shell (manifest.json + sw.js; API never cached). 102 tests green; initial JS 149 KB gz.
- `.env.local` OPENAQ_API_KEY is 12 chars and OpenAQ returns HTTP 401 — not a valid key (real keys are 64 hex chars). Needs a real key from explore.openaq.org.
- Activity lens (runner/worker/parent) in @breeze/core tips (+6 tests), /app layout decongested (2-column balanced flow, hero split into top bar + guidance row). 108 tests green.
- OpenAQ key validated (HTTP 200). Client fixed: limit=1000, dead stations skipped via datetimeLast, PM2.5-sensor-only (no other-parameter fallback), real units, up to 5 candidates. Trend compares model-vs-model. 113 tests.
