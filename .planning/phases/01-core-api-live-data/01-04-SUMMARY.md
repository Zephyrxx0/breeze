# Summary: 01-04 API Scaffold & Upstream Clients

**Status:** Completed
**Date:** 2026-10-11

## Delivered

- `apps/api/src/app.ts`: Initialized Hono application with health route mount and central error handler (no `cors()` middleware per Pitfall 3).
- `apps/api/src/lambda.ts`: Exported handler using standalone `@hono/aws-lambda`.
- `apps/api/src/dev.ts`: Local development server with root `.env` loader anchored to repository root.
- `apps/api/src/routes/health.ts`: Implemented `GET /api/health` responding with status, ISO timestamp, and version.
- `apps/api/src/cache.ts`: Module-scoped in-memory TTL cache with FIFO eviction (200-key cap) and stale fallback support up to 3 hours.
- `apps/api/template.yaml`: AWS SAM template defining `nodejs24.x` arm64 Lambda with Function URL, NoEcho OpenAQ key parameter, and esbuild bundling properties.
- Upstream Clients:
  - `apps/api/src/clients/openmeteoAir.ts`: Open-Meteo Air Quality client with zod validation, 4s timeout, and `AIR_BASE_URL` override.
  - `apps/api/src/clients/openmeteoForecast.ts`: Open-Meteo Forecast client with zod validation, 4s timeout, and `FORECAST_BASE_URL` override.
  - `apps/api/src/clients/openaq.ts`: OpenAQ v3 client with correct bbox order (`west,south,east,north`), parallel `/latest` fetches for up to 3 nearest stations, env-only API key handling, and `OPENAQ_BASE_URL` override.
  - `apps/web/src/lib/geocode.ts`: Client-side geocoding client with 8s timeout, zod validation with default empty results, and defensive `IN` country filtering.
- Testing:
  - `apps/api/test/helpers/mockUpstream.ts`: In-process ephemeral HTTP server for hermetic testing.
  - `apps/api/test/clients.test.ts`: Complete hermetic test suite covering all four clients, bbox assertions, missing key refusal, and timeout aborts.

## Verification

- Dev server boots on custom port and answers `GET /api/health` with `status: "ok"`.
- `sam build --build-in-source` executes successfully and produces `.aws-sam/build/BreezeApi/lambda.js`.
- All client tests passed with zero live network calls in test runs.
