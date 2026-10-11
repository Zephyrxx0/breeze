# Phase 3: Deploy to Public URL - Context

**Gathered:** 2026-10-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers the live, phone-verified public AWS deployment of the Breeze system within the Saturday 6 PM roadmap cut-rule:
- `apps/api` deployed to AWS Lambda (Node.js 24 arm64) with a public Function URL via AWS SAM CLI (`sam deploy`) into `ap-south-1` (Mumbai).
- `apps/web` deployed to AWS Amplify Hosting connected to the repository monorepo root, building with pnpm, routing through SPA URL rewrite rules, and targeting the default Amplify domain (`*.amplifyapp.com`).
- CORS allow-list configuration ensuring only the deployed Amplify origin and local dev can call the Function URL, returning a single Access-Control-Allow-Origin header without wildcards in production.
- Automated deployment verification (`scripts/verify-deploy.ts` or shell harness) checking curl CORS response, p95 latency under warm 4G budget, bundle size budget (<200 KB gzipped), and guided real mobile device testing over cellular data.

**Explicitly NOT in this phase:** Sensitive profile toggle & WCAG AA audit (Phase 4), PNG share card & saved places (Phase 5), NASA FIRMS fire heuristic (P2/v2).

</domain>

<decisions>
## Implementation Decisions

### AWS Credentials & Tooling Environment
- **D-01:** **AWS Region & Credential Storage** — Credentials configured via standard `~/.aws/credentials` using target region `ap-south-1` (Mumbai) to ensure lowest latency across Indian users. — **Reversibility:** costly — changing regions post-deployment moves stacks, creates new Function URLs, and alters routing latency.
- **D-02:** **CLI Tooling Permission & Setup** — In compliance with user environment rules, ask the user before installing AWS CLI if required, or prompt user to configure credentials/profiles so SAM CLI can execute deployments smoothly.
- **D-03:** **Checked-in SAM Configuration** — Maintain `apps/api/samconfig.toml` checked into git with non-sensitive defaults (`stack_name = "breeze-api-prod"`, `region = "ap-south-1"`, `capabilities = "CAPABILITY_IAM"`), using `--build-in-source` or standard esbuild pipeline.

### CORS & Deployment Sequencing
- **D-04:** **Two-Pass Deployment Pipeline** — Deploy the SAM API stack first to obtain the immutable Lambda Function URL endpoint → Provision and deploy AWS Amplify Hosting with `VITE_API_BASE_URL` pointing to the Lambda Function URL → Update SAM stack parameter `AllowedOrigin` with the exact deployed Amplify domain to eliminate wildcard CORS in production. — **Reversibility:** costly — affects CORS headers, API security, and frontend data-fetching connectivity.
- **D-05:** **Public Domain Target** — Deploy to the default AWS Amplify domain (e.g. `https://main.<app-id>.amplifyapp.com`) to satisfy the 48-hour timeline and Saturday 6 PM hard cut-rule gate. Custom domain routing (Route 53 / custom CNAME) is deferred.
- **D-06:** **Amplify SPA Rewrite Regex** — Configure standard Amplify single-page application redirect/rewrite rule:
  - Source: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
  - Target: `/index.html`
  - Status: `200`
  Ensures direct navigation and deep links (`/?lat=..&lon=..&name=..`) load the SPA cleanly instead of returning 404 or serving raw HTML for static assets.

### Secrets & API Keys in CI/CD
- **D-07:** **OPENAQ_API_KEY Ingestion** — Pass `OPENAQ_API_KEY` dynamically during SAM deploy via `--parameter-overrides OpenAqApiKey=$OPENAQ_API_KEY` from the active environment. Marked with `NoEcho: true` in `template.yaml` to ensure it is never exposed in CloudFormation outputs, logs, or client bundles.
- **D-08:** **Monorepo Amplify Build Specification** — Root `amplify.yml` configured to build `apps/web` with pnpm:
  - Base directory: `apps/web/dist`
  - Build commands: `pnpm install --frozen-lockfile` and `pnpm --filter @breeze/web build`
  - Injects `VITE_API_BASE_URL` from Amplify console environment variables.

### Verification & Performance Gating
- **D-09:** **Automated Deployment Verification Suite** — Create an automated script (`scripts/verify-deploy.ts` or shell equivalent) testing:
  - `curl -I -H "Origin: <AmplifyDomain>" <FunctionUrl>/api/assess` returns exactly one `access-control-allow-origin` matching the origin.
  - Warm API latency p95 ≤ 2.5s.
  - Total production JS bundle < 200 KB gzipped.
  - Generates a summary log for sign-off.
- **D-10:** **Mobile & Signed-Out Validation** — Conduct validation on a real phone over mobile data / cellular connection and incognito private windows to confirm full end-to-end functionality within the Sat 6 PM cut-rule window.

### the agent's Discretion
Downstream agents retain flexibility on exact esbuild bundling flags in SAM `template.yaml`, specific CloudWatch log group retention periods (e.g. 7–14 days), and exact output formatting in the automated verification script.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Deployment & Architecture Specifications
- `PRD.md` §10 — Performance & architecture: verdict visible <3 s warm on 4G, API p95 ≤2.5 s warm / 5 s cold, initial JS <200 KB gzipped, Lighthouse mobile ≥90.
- `PRD.md` §12 — API specification: GET `/api/assess`, Function URL configuration, CORS allow-list rules, and CloudWatch structured logging.
- `PRD.md` §18 — 48-hour schedule and cut rules: Saturday afternoon public URL gate (miss Sat 6 PM ⇒ drop P1 and P2).
- `docs/adr/0002-no-database-state-in-url.md` — URL query parameter state architecture requiring SPA rewrite support on static hosts.

### Existing Deployment Files & Upstream Configs
- `apps/api/template.yaml` — AWS SAM CloudFormation template declaring Lambda Function (`BreezeApi`), nodejs24.x arm64 runtime, and FunctionUrlConfig.
- `apps/api/src/lambda.ts` — Hono `@hono/aws-lambda` entry point.
- `apps/web/package.json` — Frontend build scripts and static asset generation targeting `dist`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/template.yaml`: Working SAM template with `BreezeApi` resource, Function URL configuration, and CORS parameters ready for deployment.
- `apps/api/src/lambda.ts`: Adapter using `@hono/aws-lambda` handler wrapping the core Hono application.
- `apps/web/vite.config.ts`: Vite build configuration outputting optimized static assets with gzip compression compatibility.

### Established Patterns
- SAM esbuild bundling with `BuildMethod: esbuild`, `Target: es2023`, `Format: esm`.
- Zero-database architecture: pure static frontend on Amplify calling serverless Lambda Function URL.
- CORS restricted to Function URL layer rather than duplicating in Hono code.

### Integration Points
- `apps/web/src/App.tsx` & `main.tsx`: `import.meta.env.VITE_API_BASE_URL` dictates where assess requests are routed in production.
- CloudWatch logs: structured JSON request logging (`requestId`, `ip_hash`, `upstream_status`, `duration_ms`).

</code_context>

<specifics>
## Specific Ideas

- Two-pass SAM deployment: Pass 1 gets Function URL for Amplify; Pass 2 locks `AllowedOrigin` to deployed Amplify domain.
- Automated `verify-deploy.ts` verifies single-ACAO header and p95 latency before declaring Phase 3 complete.
- Test deep links like `https://<amplify-id>.amplifyapp.com/?lat=28.61&lon=77.21&name=New%20Delhi` in private browsing to prove SPA rewrites serve assets properly.

</specifics>

<deferred>
## Deferred Ideas

- Sensitive toggle and WCAG AA accessibility audit (Phase 4).
- Custom Route 53 domain mapping (Phase 5 / Post-hackathon).
- PNG share card with html-to-image and saved place chips (Phase 5).
- NASA FIRMS fire heuristic (P2 / v2).

</deferred>

---

*Phase: 3-Deploy to Public URL*
*Context gathered: 2026-10-11*
