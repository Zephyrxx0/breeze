# Plan 03-01 Summary: SAM API Deploy & Function URL

**Executed:** 2026-10-11
**Phase:** 03-deploy-to-public-url
**Plan:** 01
**Status:** Complete (tracer slice proven)

## What was built

1. **Standalone Bundling for apps/api:**
   - Configured `esbuild` script in `apps/api/package.json` compiling `src/lambda.ts` into a self-contained bundle `dist/lambda.mjs`.
   - Bypassed AWS SAM's internal `NodejsNpmEsbuildBuilder` which failed on pnpm monorepo `"workspace:*"` protocol dependencies.

2. **Checked-in SAM Configuration & Template:**
   - Authored `apps/api/samconfig.toml` targeting `ap-south-1` (Mumbai) with stack name `breeze-api-prod`.
   - Updated `apps/api/template.yaml` to point `CodeUri: dist`, `Handler: lambda.handler`, using `nodejs24.x` on `arm64`.
   - Configured `FunctionUrlConfig.Cors` parameterized by `AllowedOrigin` and `NoEcho: true` for `OpenAqApiKey`.

3. **Client Configuration for Absolute Function URL:**
   - Updated `apps/web/src/hooks/useAssessment.ts` to prepend `import.meta.env.VITE_API_BASE_URL || ""` to `/api/assess`, enabling production builds to target the absolute Lambda Function URL while maintaining local proxy support.

4. **Pass 1 SAM Deployment & Live Function URL:**
   - Deployed `breeze-api-prod` stack successfully to AWS `ap-south-1`.
   - Obtained active Function URL:
     `https://gnwpit4zuxcyot7ojhizhvi3ji0sbihv.lambda-url.ap-south-1.on.aws/`

## Verification Results

- `curl -s -i "${FUNCTION_URL}api/health"` returned HTTP 200 with status `ok`.
- Preflight `OPTIONS` returned HTTP 200 with `Access-Control-Allow-Origin: https://example.com` and `Access-Control-Allow-Methods: GET`.
- Exactly 1 `access-control-allow-origin` header was returned (no duplication from application middleware).
- Live assessment query for New Delhi (`?lat=28.61&lon=77.21`) returned HTTP 200 with honest live assessment payload and low-latency CAMS response.

## Artifacts Produced

- `apps/api/dist/lambda.mjs`
- `apps/api/samconfig.toml`
- `apps/api/template.yaml`
- `apps/web/src/hooks/useAssessment.ts`
- Live AWS Lambda Function URL: `https://gnwpit4zuxcyot7ojhizhvi3ji0sbihv.lambda-url.ap-south-1.on.aws/`

Wave 1 (Plan 03-01) is complete and verified. Ready for Wave 2 (Plan 03-02).
