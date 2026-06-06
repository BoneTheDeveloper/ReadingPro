# Root Configuration

## Overview

The project root is reserved for files that are discovered by package managers, Next.js, deployment tooling, or common editor integrations. Runner-specific config belongs beside the runner it controls.

## Keep At Root

| File | Reason |
|------|--------|
| `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` | Package manager and workspace entrypoints. |
| `.nvmrc` | Node version discovery for local shells and CI. |
| `.env.example`, `.env.local`, `.env.test` | Environment files are conventionally loaded from the app root. Only `.env.example` is tracked. |
| `next.config.ts`, `next-env.d.ts` | Next.js root-discovered app config and generated type reference. |
| `tsconfig.json` | TypeScript, Next.js, editors, and path alias source of truth. |
| `eslint.config.mjs`, `postcss.config.mjs` | Root-discovered lint and CSS toolchain config. |
| `components.json` | shadcn/ui CLI component registry and alias config. |
| `prisma.config.ts` | Prisma CLI root-discovered schema and migration config. |
| `sentry.server.config.ts`, `sentry.edge.config.ts` | Sentry/Next.js runtime init files imported by `src/instrumentation.ts`. |
| `vercel.json` | Vercel deployment config. |
| `.gitignore`, `.dockerignore`, `.github/` | Repository, Docker, and GitHub platform config. |
| `Makefile` | Local command aliases for humans and agents. |
| `README.md`, `AGENT.md` | Root onboarding entrypoints. |

## Keep Out Of Root

| Location | Owns |
|----------|------|
| `tests/vitest/vitest.config.ts` | Vitest runner config. Package scripts pass this file explicitly. |
| `playwright/` | Playwright configs, browser specs, Docker runner, screenshots, and Playwright-only helpers. |
| `tests/performance/` | Performance benchmark scripts, helpers, and benchmark docs. |
| `prisma/` | Prisma schema, migrations, seed data, and database procedures. |
| `localization/` | Translation messages and localization-specific docs. |
| `docs/` | Human and agent-readable project documentation. |
| `plans/` | Implementation plans, reports, and historical work records. |
| `scripts/` | Build, database, dictionary, and operational utility scripts. |

## Generated Files

Generated output should stay ignored and disposable:

- TypeScript incremental metadata writes to `.next/cache/typescript/tsconfig.tsbuildinfo`.
- Next.js output stays in `.next/`, `.next-performance/`, or `.next-performance-production/`.
- Test output stays in `coverage/`, `test-results/`, `.auth/`, or `playwright-report/`.
- Vercel local state stays in `.vercel/`.

If a new config file is needed, keep it at root only when the tool expects root discovery or editor/CI support would become worse. Otherwise place it beside the owning tool directory and call it explicitly from `package.json`.
