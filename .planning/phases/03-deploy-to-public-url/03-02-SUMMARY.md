# Plan 03-02 Summary: Amplify Production Deploy & Verification

**Executed:** 2026-10-11  
**Phase:** 03-deploy-to-public-url  
**Plan:** 02  
**Status:** Complete (Public URL gate satisfied)  

---

## 1. What was built

1. **Root `amplify.yml` Build Specification:**
   - Configured pnpm via `corepack` targeting `apps/web` application root.
   - Built production bundle with `pnpm --filter @breeze/web build` outputting to `dist`.

2. **Automated Deployment Verification Suite (`scripts/verify-deploy.ts`):**
   - Implemented automated multi-point verification testing:
     - JS bundle size inspection (< 200 KB gzip budget target).
     - CORS single `Access-Control-Allow-Origin` header assertion matching Amplify domain.
     - Warm API latency p95 <= 2.5s and live schema assertion on `/api/assess`.
     - SPA deep-link rewrite test with query parameters (`?lat=..&lon=..`).

3. **CORS Lockdown & Production Deploy:**
   - Deployed Amplify frontend at `https://main.d3332j0zzsigpw.amplifyapp.com`.
   - Updated `apps/api/samconfig.toml` parameter overrides to lock CORS `AllowedOrigin` to the deployed Amplify origin.
   - Verified Lambda Function URL (`https://gnwpit4zuxcyot7ojhizhvi3ji0sbihv.lambda-url.ap-south-1.on.aws/`).

---

## 2. Verification Results

Running `pnpm run verify:deploy`:
- `[✓ PASS]` **JS Bundle Size:** 123.42 KB gzipped across 1 file(s) (< 200 KB budget).
- `[✓ PASS]` **CORS:** Status 200, exactly 1 ACAO header matching `https://main.d3332j0zzsigpw.amplifyapp.com`.
- `[✓ PASS]` **API Latency:** p95 = 854 ms (warm samples: 32ms, 48ms, 49ms, 85ms, 854ms), air status `ok`.
- `[✓ PASS]` **Deep-Link SPA Rewrite:** Status 200, Content-Type `text/html`.

---

## 3. Artifacts Produced & Live Endpoints

- Web Application: `https://main.d3332j0zzsigpw.amplifyapp.com`
- Backend Function URL: `https://gnwpit4zuxcyot7ojhizhvi3ji0sbihv.lambda-url.ap-south-1.on.aws/api/assess`
- Verification Script: `scripts/verify-deploy.ts`
- Amplify Build Spec: `amplify.yml`
