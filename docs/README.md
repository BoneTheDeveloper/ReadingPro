# Documentation Index

Start here when onboarding to the English Reading Training App docs.

## Project Architecture

### Source Layout

```text
src/
  app/                  Next.js routing layer: thin pages + thin API route handlers (HTTP adapters)
  server/               Backend layer (enforced server-only): db, ai, auth, http, modules
  shared/               Contract layer (isomorphic/pure): Zod schemas, DTOs, pure utils
  features/             Frontend feature layer (FSD-lite): ui, hooks, model, api
  components/           Universal design system primitives (UI atoms)
```

### Core Invariants

1.  **Strict Boundary:** `src/server/` is marked `server-only`. Backend logic never leaks to the client.
2.  **Pure Contract:** `src/shared/` contains only Zod schemas and types. It never imports from `server/`.
3.  **Frontend Logic:** Organized by feature in `src/features/`. Communicates with backend only via standard HTTP API routes.

## Reading Order

1. [Project Overview PDR](project-overview-pdr.md) - product purpose, users, MVP scope, and current state.
2. [Codebase Summary](codebase-summary.md) - detailed source layout, framework stack, and feature map.
3. [Code Standards](code-standards.md) - thin top-level convention for writing code and placing files.
4. [System Architecture](Architecture/system-architecture.md) - high-level system map.
5. [Runtime Architecture](Architecture/runtime-architecture.md) - Next.js App Router, RSC, route handlers, and server/client boundaries.
6. [Frontend UI Architecture](Architecture/frontend-ui-architecture/README.md) - screen-level UI contracts and page descriptions.
7. [API Index](API/api-index.md) - route inventory and feature API docs.
8. [Data Dictionary](Database/data-dictionary.md) and [ERD](Database/erd.md) - database shape and ownership fields.
9. [Local Development](Operations/local-development.md) - setup, scripts, and common checks.

## Main Sections

| Section | Purpose |
|---------|---------|
| [Code Standards](code-standards.md) | Top-level code and file placement conventions; links to detailed rule owners. |
| [Architecture](Architecture/system-architecture.md) | Runtime, frontend UI, auth, database, storage, API, observability, and deployment decisions. |
| [Product](Product/feature-scope.md) | User flows, use cases, MVP boundaries, and product assumptions. |
| [Flows](Flows/upload-flow.md) | End-to-end feature flows from UI to persistence. |
| [API](API/api-index.md) | API conventions and per-feature route docs. |
| [Database](Database/data-dictionary.md) | Prisma/Neon schema, migrations, seed data, and environment contracts. |
| [ADR](ADR/0001-use-clerk.md) | Architecture decision records. |
| [Operations](Operations/local-development.md) | Local setup, env vars, deployment, migrations, root configuration, debugging, and security checklist. |
| [Testing](Testing/testing-strategy.md) | Unit, integration, e2e, performance, and contract test expectations. |

## Supplemental Docs

Existing detailed design notes remain under `docs/Design/`, Sentry usage notes under `docs/Sentry/`, and journals under `docs/journals/`. Treat this index and the architecture folders above as the current navigation layer.

## Source Of Truth Rules

Do not duplicate detailed rules that belong beside executable assets:

| Rule area | Canonical location | `docs/` role |
|-----------|--------------------|--------------|
| Code and file placement | [`code-standards.md`](code-standards.md), [`codebase-summary.md`](codebase-summary.md) | Keep broad conventions and feature map only. |
| Page and feature UI composition | [`Architecture/frontend-ui-architecture/page-composition-conventions.md`](Architecture/frontend-ui-architecture/page-composition-conventions.md) | Link and summarize only. |
| API implementation and contracts | [`API/api-implementation-conventions.md`](API/api-implementation-conventions.md), [`API/api-index.md`](API/api-index.md) | Keep detailed route behavior in API docs. |
| Prisma migration procedure | [`../prisma/migrations-guide.md`](../prisma/migrations-guide.md), [`../prisma/SECURITY.md`](../prisma/SECURITY.md) | Link and summarize only. |
| Root configuration ownership | [`Operations/root-configuration.md`](Operations/root-configuration.md) | Record what belongs at root versus owning subdirectories. |
| Test suite structure | [`../tests/README.md`](../tests/README.md) | Link and summarize only. |
| Playwright local playground | [`../playwright/README.md`](../playwright/README.md) | Link and summarize only. |
| Performance query budgets | [`../tests/performance/query-budget-benchmarks.md`](../tests/performance/query-budget-benchmarks.md), [`../tests/performance/README.md`](../tests/performance/README.md) | Link and summarize only. |

When a rule is specific to a folder, keep the detailed rule in that folder. Put only the high-level concept and cross-link in `docs/`.
