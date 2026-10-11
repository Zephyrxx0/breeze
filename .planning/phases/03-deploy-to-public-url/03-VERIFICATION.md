# Phase 03: Deploy to Public URL Verification Report

**Phase Goal:** The app is live at a public AWS URL, verified on a real phone, inside the Sat 6 PM cut rule — deployment is a roadmap-level gate, not an afterthought.
**Requirements:** DEPL-01, DEPL-02
**Status:** PASSED

## Requirements Verification

### DEPL-01: Public AWS URL & Mobile Connectivity
- **Backend Infrastructure:**
  - Deployed AWS SAM stack `breeze-api-prod` in `ap-south-1` (Mumbai) using `nodejs24.x` on `arm64`.
  - Live Function URL: `https://gnwpit4zuxcyot7ojhizhvi3ji0sbihv.lambda-url.ap-south-1.on.aws/`
  - CORS: Configured with `AllowedOrigin: "https://main.d3332j0zzsigpw.amplifyapp.com"`. Preflight `OPTIONS` and API `GET` return exactly one `access-control-allow-origin` header.
- **Frontend Hosting:**
  - Deployed AWS Amplify Hosting monorepo app `breeze-web` (`appId: d3332j0zzsigpw`, branch `main`).
  - Live Public URL: `https://main.d3332j0zzsigpw.amplifyapp.com`
  - SPA Rewrite Rule: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/> -> /index.html [200]` verified for deep links with query parameters (`?lat=28.61&lon=77.21&name=New%20Delhi`).
- **Result:** PASSED

### DEPL-02: Performance Budget
- **JavaScript Bundle Size:**
  - Budget: < 200 KB gzipped.
  - Actual: **111.57 KB gzipped** (369.17 KB raw) across 1 production bundle.
  - Result: PASSED (well within budget).
- **API Latency (Warm p95):**
  - Budget: <= 2.5 seconds.
  - Actual p95: **34.1ms** (samples: 28ms, 29ms, 29ms, 31ms, 34ms).
  - Result: PASSED.
- **Data Honesty:**
  - 100% live data served from Open-Meteo CAMS; no mock data or synthetic fallbacks.
  - Result: PASSED.

## Automated Verification Suite

Execution of `pnpm run verify:deploy`:
```
=================================================
   Breeze Deployment Verification Suite          
=================================================
Amplify URL:  https://main.d3332j0zzsigpw.amplifyapp.com
Function URL: https://gnwpit4zuxcyot7ojhizhvi3ji0sbihv.lambda-url.ap-south-1.on.aws
-------------------------------------------------

Verification Summary:
[✓ PASS] JS Bundle Size (< 200 KB gzipped)
       Details: Total: 111.57 KB gzipped (369.17 KB raw) across 1 file(s). Budget: 200 KB.

[✓ PASS] Single Access-Control-Allow-Origin Header
       Details: Status: 200, ACAO header count: 1, Value: "https://main.d3332j0zzsigpw.amplifyapp.com"

[✓ PASS] Warm API Latency p95 <= 2.5s & Live Schema
       Details: p95: 34.1ms (samples: 28ms, 29ms, 29ms, 31ms, 34ms). Air status: ok

[✓ PASS] Amplify Deep-Link SPA Rewrite (?lat=..&lon=..)
       Details: Status: 200, Content-Type: text/html

All automated checks PASSED!
```

## Cut-Rule Assessment

The Saturday 6 PM deployment cut-rule requirement has been cleared with zero scope shedding needed. The project is fully unblocked to proceed to Phase 4 (Hardening) and Phase 5 (Sharing & Submission).
