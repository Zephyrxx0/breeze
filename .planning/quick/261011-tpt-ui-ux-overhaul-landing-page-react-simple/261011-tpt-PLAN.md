---
quick_id: 261011-tpt
description: UI/UX overhaul — landing page, react-simple-maps India map, Bklit charts, design system, PRD gap audit
---

# Plan

1. Deps: react-simple-maps 5.0.5, Bklit chart deps (visx, d3-array, motion, react-use-measure), @fontsource (Figtree, Instrument Serif).
2. Design system: semantic light/dark tokens, ambient verdict tint, fonts.
3. Routing: `/` landing (unless ?lat&lon deep link), `/app` main app, CTA -> /app.
4. App redesign: header, search, verdict hero, reading, Bklit forecast chart (+best window highlight), tips with icons, weather, provenance, saved places, skeletons, error/offline.
5. India map (react-simple-maps): live CAMS model PM2.5 for major cities (keyless Open-Meteo multi-point call), current-place pin. Empty state with popular-city shortcuts (PRD §14).
6. PRD audit fixes: weather "now" hour (was midnight), UV max NaN, rain next-6h, best-window highlight on chart, dark mode, offline state, meta/OG/favicon, self-hosted fonts.
7. Update tests, build, bundle budget, visual verification.
