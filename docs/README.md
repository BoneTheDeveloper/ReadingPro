# Documentation Index

Start here when onboarding to the English Reading Training App docs.

## Reading Order

1. [Project Overview PDR](project-overview-pdr.md) - product purpose, users, MVP scope, and current state.
2. [Codebase Summary](codebase-summary.md) - source layout, framework stack, and core modules.
3. [System Architecture](Architecture/system-architecture.md) - high-level system map.
4. [Runtime Architecture](Architecture/runtime-architecture.md) - Next.js App Router, RSC, route handlers, and server/client boundaries.
5. [Frontend UI Architecture](Architecture/frontend-ui-architecture/README.md) - screen-level UI contracts and page descriptions.
6. [API Index](API/api-index.md) - route inventory and feature API docs.
7. [Data Dictionary](database/data-dictionary.md) and [ERD](database/erd.md) - database shape and ownership fields.
8. [Local Development](Operations/local-development.md) - setup, scripts, and common checks.

## Main Sections

| Section | Purpose |
|---------|---------|
| [Architecture](Architecture/system-architecture.md) | Runtime, frontend UI, auth, database, storage, API, observability, and deployment decisions. |
| [Product](Product/feature-scope.md) | User flows, use cases, MVP boundaries, and product assumptions. |
| [Flows](Flows/upload-flow.md) | End-to-end feature flows from UI to persistence. |
| [API](API/api-index.md) | API conventions and per-feature route docs. |
| [database](database/data-dictionary.md) | Prisma/Neon schema, migrations, seed data, and environment contracts. |
| [ADR](ADR/0001-use-clerk.md) | Architecture decision records. |
| [Operations](Operations/local-development.md) | Local setup, env vars, deployment, migrations, root configuration, debugging, and security checklist. |
| [Testing](Testing/testing-strategy.md) | Unit, integration, e2e, performance, and contract test expectations. |

## Supplemental Docs

Existing detailed design notes remain under `docs/Design/`, Sentry usage notes under `docs/sentry/`, and journals under `docs/journals/`. Treat this index and the architecture folders above as the current navigation layer.

## Source Of Truth Rules

Do not duplicate detailed rules that belong beside executable assets:

| Rule area | Canonical location | `docs/` role |
|-----------|--------------------|--------------|
| Prisma migration procedure | [`../prisma/migrations-flow.md`](../prisma/migrations-flow.md), [`../prisma/migrations-guide.md`](../prisma/migrations-guide.md), [`../prisma/SECURITY.md`](../prisma/SECURITY.md) | Link and summarize only. |
| Root configuration ownership | [`Operations/root-configuration.md`](Operations/root-configuration.md) | Record what belongs at root versus owning subdirectories. |
| Test suite structure | [`../tests/README.md`](../tests/README.md) | Link and summarize only. |
| Playwright local playground | [`../playwright/README.md`](../playwright/README.md) | Link and summarize only. |
| Performance query budgets | [`../tests/performance/query-budget-benchmarks.md`](../tests/performance/query-budget-benchmarks.md), [`../tests/performance/README.md`](../tests/performance/README.md) | Link and summarize only. |

When a rule is specific to a folder, keep the detailed rule in that folder. Put only the high-level concept and cross-link in `docs/`.
