# Plan 03-02 Summary: Amplify Hosting, CORS Lockdown & Verification

**Executed:** 2026-10-11
**Phase:** 03-deploy-to-public-url
**Plan:** 02
**Status:** Complete

## What was built

1. **Monorepo Build Configuration for AWS Amplify (`amplify.yml`):**
   - Configured root `amplify.yml` tailored for a pnpm monorepo.
   - Targeted `appRoot: apps/web` with build steps: `pnpm --filter @breeze/core build` followed by `pnpm --filter @breeze/web build`.
   - Artifact base directory set to `dist` with cache paths for `.pnpm-store` and `node_modules`.

2. **AWS Amplify Hosting Deployment:**
   - Provisioned and connected AWS Amplify app `breeze-web` (`appId: d3332j0zzsigpw`, branch `main`) in region `ap-south-1`.
   - Configured production environment variable:
     - `VITE_API_BASE_URL: https://gnwpit4zuxcyot7ojhizhvi3ji0sbihv.lambda-url.ap-south-1.on.aws`
   - Configured SPA rewrite and redirect rule:
     - Source: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
     - Target: `/index.html`
     - Status: `200`
   - Active production URL:
     **`https://main.d3332j0zzsigpw.amplifyapp.com`**

3. **Pass 2 SAM Deploy — Production CORS Lockdown:**
   - Updated `apps/api/samconfig.toml` parameter overrides from wildcard `*` to:
     `AllowedOrigin="https://main.d3332j0zzsigpw.amplifyapp.com"`
   - Redeployed `breeze-api-prod` stack via SAM CLI to lock down the Function URL CORS to the exact Amplify production domain.

4. **Automated Verification Harness (`scripts/verify-deploy.ts`):**
   - Authored and verified script testing the four deployment gates:
     - Gzipped JS bundle size < 200 KB
     - Single `access-control-allow-origin` header
     - API warm p95 latency <= 2.5s and live schema validation
     - Amplify deep-link SPA rewrite returning HTTP 200 `text/html`
   - Added `verify:deploy` script to root `package.json`.

## Verification Results

Running `pnpm run verify:deploy https://main.d3332j0zzsigpw.amplifyapp.com https://gnwpit4zuxcyot7ojhizhvi3ji0sbihv.lambda-url.ap-south-1.on.aws`:

- **[PASS] JS Bundle Size (< 200 KB gzipped):**
  - Actual: **111.57 KB gzipped** (369.17 KB raw) across 1 bundle file. Budget: 200 KB.
- **[PASS] Single Access-Control-Allow-Origin Header:**
  - Status: 200, ACAO header count: 1, Value: `https://main.d3332j0zzsigpw.amplifyapp.com`.
  - Non-allowed origins do not receive allow headers.
- **[PASS] Warm API Latency p95 <= 2.5s & Live Schema:**
  - Actual p95: **34.1ms** (samples: 28ms, 29ms, 29ms, 31ms, 34ms).
  - Schema status: `ok`, live data returned from CAMS without mock data.
- **[PASS] Amplify Deep-Link SPA Rewrite (?lat=..&lon=..):**
  - Direct request to `https://main.d3332j0zzsigpw.amplifyapp.com/?lat=28.61&lon=77.21&name=New%20Delhi` returns HTTP 200 `text/html`.
- **Saturday 6 PM Cut-Rule Gate:**
  - Cleared. The application is live at a public AWS URL ahead of the Saturday cut rule window.

## Artifacts Produced

- `amplify.yml`
- `scripts/verify-deploy.ts`
- `apps/api/samconfig.toml` (CORS locked)
- Live Production URL: `https://main.d3332j0zzsigpw.amplifyapp.com`
- Live Function URL: `https://gnwpit4zuxcyot7ojhizhvi3ji0sbihv.lambda-url.ap-south-1.on.aws`
