# Agent Guide

Lightweight routing guide for agents working in this repo. Do not duplicate detailed docs here; read the canonical file for the task.

## Start Here

1. Read `docs/README.md` for the docs map.
2. Read `docs/codebase-summary.md` for source layout and core modules.
3. Use the task routing table below before editing.

## Task Routing

| Task | Read first | Then read when needed |
|------|------------|-----------------------|
| Product scope or user behavior | `docs/project-overview-pdr.md` | `docs/Product/feature-scope.md`, `docs/Product/user-flows.md`, `docs/Product/use-cases.md` |
| System architecture | `docs/Architecture/system-architecture.md` | Runtime/auth/database/storage/API/observability/deployment docs under `docs/Architecture/` |
| Next.js runtime or RSC boundaries | `docs/Architecture/runtime-architecture.md` | `docs/code-standards.md` |
| Auth, Clerk, ownership | `docs/Architecture/auth-architecture.md` | `src/lib/auth/*`, `src/proxy.ts` |
| Database schema or ownership fields | `docs/Architecture/database-architecture.md` | `docs/database/data-dictionary.md`, `docs/database/erd.md`, `prisma/schema.prisma` |
| Prisma migration work | `prisma/migrations-flow.md` | `prisma/migrations-guide.md`, `prisma/SECURITY.md`, `docs/database/migration-flow.md` |
| Storage or uploaded files | `docs/Architecture/storage-architecture.md` | `src/lib/storage/blob-storage.ts`, `docs/Flows/upload-flow.md` |
| API implementation | `docs/Architecture/api-architecture.md` | `docs/API/Api-impliment-conventions.md`, `docs/API/api-index.md`, matching `docs/API/Routes/*.md` |
| Upload flow | `docs/Flows/upload-flow.md` | `src/features/upload/*`, `src/app/api/upload/*` |
| Study workspace | `docs/Flows/study-flow.md` | `src/features/study/*` |
| Translation flow | `docs/Flows/translation-flow.md` | `src/lib/translation/*`, `src/app/api/translate/route.ts` |
| Dictionary flow | `docs/Flows/dictionary-flow.md` | `src/lib/dictionary/*`, `docs/API/Routes/dictionary-feature.md` |
| Study chat | `docs/Flows/study-chat-flow.md` | `src/app/api/study-chat/route.ts`, `src/features/study/study-chat-panel.tsx` |
| Cards, SM-2, progress | `docs/Flows/spaced-repetition-flow.md` | `src/lib/algorithms/sm2.ts`, `src/lib/db/card-review-queries.ts` |
| Testing strategy | `docs/Testing/testing-strategy.md` | `tests/README.md`, `playwright/README.md` |
| Playwright local playground | `playwright/README.md` | `playwright/playwright.config.ts`, `playwright/playwright.screenshot.config.ts` |
| Performance benchmarks | `docs/Testing/performance-benchmarks.md` | `tests/performance/README.md`, `tests/performance/query-budget-benchmarks.md` |
| Deployment or env vars | `docs/Architecture/deployment-architecture.md` | `docs/Operations/deployment-runbook.md`, `docs/Operations/env-vars.md` |
| Production migration runbook | `docs/Operations/production-migration-runbook.md` | `prisma/migrations-flow.md` |
| Incident/debugging | `docs/Operations/incident-debugging.md` | Sentry docs under `docs/sentry/` |
| Security review | `docs/Operations/security-checklist.md` | `prisma/SECURITY.md`, auth/database architecture docs |
| Roadmap or priorities | `docs/project-roadmap.md` | `docs/Product/feature-scope.md` |

## Source-Of-Truth Rule

- Keep detailed rules beside the files they govern.
- `prisma/` owns Prisma migration and security procedure.
- `tests/` owns Vitest, performance benchmark, shared fixture, and shared test-helper rules.
- `playwright/` owns the local Playwright playground.
- `docs/` owns architecture, product, flow, operations, and cross-links.
- `AGENT.md` only tells agents what to read.

## Navigation

- Prefer `rg`/`rg --files` for text and file discovery.
- Use code graph/MCP navigation when available for dependency and usage checks.
- Do not read `node_modules` by default. If package API details are needed, inspect `package.json` and lockfile first, then read only the specific package `.d.ts` or export files required.

## Common Checks

Use the smallest relevant verification:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm build
pnpm test:performance
```
