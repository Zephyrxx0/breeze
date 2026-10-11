# Breeze

Breeze answers one question for any resident or visitor in India: **is the air outside OK for me right now, and what should I do about it?**

## Architecture

- **Web:** React 19 SPA (`apps/web`) powered by Vite 8.
- **API:** Hono on Node / AWS Lambda (`apps/api`), serving `GET /api/assess`.
- **Core:** `@breeze/core` (`packages/core`) holding pure domain logic (verdict matrix, effective PM2.5 ladder, cleanest window finder, geo math, and CPCB AQI categories).
- **Upstreams:** Live data from CAMS (Open-Meteo Air Quality), Open-Meteo Forecast, and OpenAQ v3 ground stations. No mocks, fail-soft per section.

## Development Loop

- `pnpm install`: Install workspace dependencies
- `pnpm dev`: Run web and API in parallel
- `pnpm test`: Run monorepo test suite (Vitest)
- `pnpm test:tz`: Run test suite under both `TZ=UTC` and `TZ=Asia/Kolkata` (DEC-04 invariant harness)
- `pnpm smoke`: Run live smoke verification script

## Environment Variables

Copy `.env.example` to `.env` if you have an OpenAQ API key:
- `OPENAQ_API_KEY`: API key from explore.openaq.org for ground station data. If missing, the API degrades gracefully (station readings unavailable, regional model verdict used).

## Runtime & Tooling Notes

Local development runs Node 22+ (satisfying Vite 8 floor), while production AWS Lambda targets `nodejs24.x` (arm64). No Node 24-exclusive APIs are used.
