# Phase 3: Deploy to Public URL - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-11
**Phase:** 03-Deploy to Public URL
**Areas discussed:** AWS Credentials & Tooling Environment, CORS & Deployment Sequencing, Secrets & API Keys in CI/CD, Verification & Perf Gating

---

## AWS Credentials & Tooling Environment

| Option | Description | Selected |
|--------|-------------|----------|
| Standard ~/.aws/credentials + region ap-south-1 (Mumbai) | Lowest latency for India; credentials stored in user profile | ✓ |
| Environment variables | In local shell/.env | |
| SSO / IAM Identity Center | AWS IAM Identity Center profile | |

**User's choice:** Standard ~/.aws/credentials + region ap-south-1 (Mumbai) for minimum latency across India.
**Notes:** ap-south-1 is chosen for minimal round-trip latency to India users.

---

## Tooling Permission Check

| Option | Description | Selected |
|--------|-------------|----------|
| Ask user before installing AWS CLI | Strictly adheres to user rule: "Before installing any application, ask the user" | ✓ |
| Rely solely on SAM CLI | Avoid installing AWS CLI | |
| Use both without asking | Not permitted by rules | |

**User's choice:** Ask user to install AWS CLI (or prompt for user permission) before running deployment commands.

---

## SAM Configuration

| Option | Description | Selected |
|--------|-------------|----------|
| Checked-in apps/api/samconfig.toml | Pre-configured defaults for stack name, region, capabilities | ✓ |
| Interactive guided deploy only | Re-run interactively every time | |
| Inline CLI arguments | In package.json script | |

**User's choice:** Checked-in apps/api/samconfig.toml with default parameters + interactive/guided flag on first deploy.

---

## CORS & Deployment Sequencing

| Option | Description | Selected |
|--------|-------------|----------|
| Two-pass deployment | SAM deploy first → Amplify deploy with VITE_API_BASE_URL → Update SAM AllowedOrigin | ✓ |
| Amplify first | Create Amplify app to get domain first | |
| Permissive origin | Keep AllowedOrigin as * permanently | |

**User's choice:** Two-pass: Deploy SAM API first (with temporary wildcard or placeholder origin) to obtain Function URL → Deploy Amplify with VITE_API_BASE_URL → Update SAM with real Amplify domain.

---

## Amplify Domain Target

| Option | Description | Selected |
|--------|-------------|----------|
| Default Amplify subdomain (*.amplifyapp.com) | Fastest path to hit Saturday 6 PM cut-rule gate | ✓ |
| Custom domain immediately | Wire Route 53 now | |
| Defer custom domain | Post-hackathon | |

**User's choice:** Default AWS Amplify subdomain (e.g. `https://main.<app-id>.amplifyapp.com`) for the 48h cut-rule demo.

---

## Amplify SPA Rewrites

| Option | Description | Selected |
|--------|-------------|----------|
| Standard Amplify regex rewrite | `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>` → `/index.html` (200) | ✓ |
| Catch-all `</**>` | Can mask static asset 404s | |

**User's choice:** Standard Amplify SPA rewrite: source regex excluding static assets → target `/index.html` (status 200).

---

## Secrets & API Keys in CI/CD

| Option | Description | Selected |
|--------|-------------|----------|
| Parameter overrides from shell env | `sam deploy --parameter-overrides OpenAqApiKey=$OPENAQ_API_KEY` | ✓ |
| AWS Secrets Manager | CloudFormation dynamic reference | |
| Interactive prompt | Manual input during deploy | |

**User's choice:** SAM parameter overrides at deploy time (`sam deploy --parameter-overrides OpenAqApiKey=$OPENAQ_API_KEY`) reading from local shell/secret env.

---

## Amplify Build Configuration

| Option | Description | Selected |
|--------|-------------|----------|
| Root amplify.yml targeting apps/web | Monorepo aware, uses pnpm | ✓ |
| Subdirectory amplify.yml | Inside apps/web | |
| Manual dist upload | S3 sync | |

**User's choice:** Monorepo root `amplify.yml` targeting `apps/web` with pnpm install & build (`pnpm --filter @breeze/web build`).

---

## Verification & Performance Gating

| Option | Description | Selected |
|--------|-------------|----------|
| Automated verification script + guided phone test | Script tests curl single-ACAO header, p95 latency, bundle size | ✓ |
| Manual curl commands only | Run manually from terminal | |
| Lighthouse CI only | Automated browser without phone check | |

**User's choice:** Automated verification script (`scripts/verify-deploy.ts` or shell script) testing curl CORS headers, latency p95, bundle size, plus guided user phone test checklist.

---

## Deep Link & Mobile Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Incognito tabs + real mobile device over 4G | Real phone check over cellular network | ✓ |
| Emulation only | DevTools mobile emulation | |

**User's choice:** Open deep links (e.g. `/?lat=28.61&lon=77.21&name=Delhi`) in signed-out incognito tabs on desktop + real mobile device over 4G/cellular.

---

## the agent's Discretion
- Exact esbuild bundling flags in SAM `template.yaml`.
- Log retention configuration for CloudWatch.
- Verification script console output formatting.

## Deferred Ideas
- Sensitive toggle and WCAG AA audit (Phase 4).
- Custom Route 53 domain mapping (Phase 5 / Post-hackathon).
- PNG share card with html-to-image and saved place chips (Phase 5).
- NASA FIRMS fire heuristic (P2 / v2).

