# Summary: 01-01 Workspace Scaffold

**Status:** Completed
**Date:** 2026-10-11

## Delivered

- Pnpm workspace configuration (`pnpm-workspace.yaml`) covering `packages/*` and `apps/*`.
- Monorepo package manifests with exact pinned versions:
  - Root: `typescript@5.9.3`, `vitest@5.0.3`, `tsx@^4.19.3`
  - `packages/core`: `@breeze/core` exporting `./src/index.ts` directly.
  - `apps/api`: `@breeze/api` with `hono@4.13.13`, `@hono/aws-lambda@1.0.1`, `@hono/node-server@2.1.4`, `zod@4.6.5`, `@breeze/core: workspace:*`.
  - `apps/web`: `@breeze/web` with `react@19.3.0`, `react-dom@19.3.0`, `zod@4.6.5`, `vite@8.3.4`, `@vitejs/plugin-react@6.1.2`, `@breeze/core: workspace:*`.
- Root test runner configured with `vitest.config.ts` (`test.projects`).
- Development scripts: `pnpm dev`, `pnpm test`, `pnpm test:tz` (`TZ=UTC vitest run && TZ=Asia/Kolkata vitest run`), `pnpm smoke`.
- Secret hygiene: `.gitignore` ignores `.env`, `.env.example` provides an `OPENAQ_API_KEY=` placeholder only.
- Minimal React 19 + Vite 8 shell in `apps/web`, builds successfully without errors.
- Documented in `README.md`.

## Verification

- `pnpm install --frozen-lockfile` passed idempotently.
- `pnpm exec vitest run --passWithNoTests` passed green across the monorepo projects.
- `pnpm --filter @breeze/web build` completed cleanly.
- No `tailwind.config.js` or `postcss.config.js` present.
- Package legitimacy verification checkpoint human-approved.
