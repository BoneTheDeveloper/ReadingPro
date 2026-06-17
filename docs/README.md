# Documentation Index

Start here when onboarding to the English Reading Training App docs.

Docs are organized **by the question each folder answers**, so there is exactly one
home for each concern. They flow with the delivery lifecycle: *why & what →
exact spec → how it's built → contracts → behavior → how we verify → how we run it.*

## Project Architecture

### Source Layout

```text
src/
  app/                  Next.js routing layer: thin pages + thin API route handlers (HTTP adapters)
  server/               Backend layer (enforced server-only): db, ai, auth, http, modules
  contracts/            Contract layer (isomorphic/pure): Zod schemas, DTOs, pure utils
  features/             Frontend feature layer (FSD-lite): ui, hooks, model, api-client
  ui/                   Universal design system: primitives (UI atoms) + layout
```

### Core Invariants

1.  **Strict Boundary:** `src/server/` is marked `server-only`. Backend logic never leaks to the client.
2.  **Pure Contract:** `src/contracts/` contains only Zod schemas and types. It never imports from `server/`.
3.  **Frontend Logic:** Organized by feature in `src/features/`. Communicates with backend only via standard HTTP API routes.

## Reading Order

1. [Product Overview PDR](Product/overview-pdr.md) - product purpose, users, MVP scope, and current state.
2. [Codebase Summary](codebase-summary.md) - detailed source layout, framework stack, and feature map.
3. [Code Standards](code-standards.md) - thin top-level convention for writing code and placing files.
4. [System Architecture](Architecture/system-architecture.md) - high-level system map.
5. [Runtime Architecture](Architecture/runtime-architecture.md) - Next.js App Router, RSC, route handlers, and server/client boundaries.
6. [Frontend UI Architecture](Architecture/frontend-ui-architecture/README.md) - screen-level UI contracts and page descriptions.
7. [Requirements](Requirements/use-cases.md) - business/software requirements, use cases, and user stories.
8. [API Index](API/api-index.md) - route inventory and feature API docs.
9. [Database conventions](Database/data-dictionary.md) - identifier policy and string-enum catalogs (schema in [`prisma/schema/`](../prisma/schema/) is the source of truth).
10. [Quick Start](../README.md) - setup, scripts, and common checks.

## Main Sections

Each folder owns exactly one question. Nothing is duplicated across folders.

| Section | Question it answers | Contents |
|---------|---------------------|----------|
| [Product](Product/overview-pdr.md) | Why & what (strategy) | [Overview PDR](Product/overview-pdr.md), [feature scope](Product/feature-scope.md), [roadmap](Product/roadmap.md), [changelog](Product/changelog.md). |
| [Requirements](Requirements/use-cases.md) | What exactly must it do (spec) | [Business](Requirements/business-requirements.md) + [software](Requirements/software-requirements.md) requirements, [use cases](Requirements/use-cases.md), [user stories](Requirements/user-stories.md). |
| [Architecture](Architecture/system-architecture.md) | How is it built | Runtime, frontend UI, auth, database design, storage, observability, deployment. |
| [API](API/api-index.md) | Request/response contracts | API conventions and per-feature route docs. |
| [Database](Database/data-dictionary.md) | Data contracts | Identifier policy + string-enum catalogs. Schema, columns, and relations are the [`prisma/schema/`](../prisma/schema/) source of truth; migration procedure in [`../prisma/`](../prisma/migrations-guide.md). |
| [Flows](Flows/upload-flow.md) | How features behave end-to-end | UI-to-persistence flow per feature. |
| [Testing](Testing/testing-strategy.md) | How we verify it | [Strategy](Testing/testing-strategy.md), [test scenarios](Testing/test-scenarios.md), [traceability matrix](Testing/traceability-matrix.md), [contract tests](Testing/contract-tests.md), [performance benchmarks](Testing/performance-benchmarks.md). |
| [Design](Design/design-guidelines.md) | Visual system | Design guidelines, styling guide, dark-mode color design. |

`code-standards.md` and `codebase-summary.md` stay at the `docs/` root as the two
engineering-onboarding hubs. Dated session notes live under [`journals/`](journals/).

## Docs That Live Next to Their Code

Some docs intentionally live beside the code they describe, not under `docs/`, so the
information sits with its subject. Find them by role here:

| Role | Location |
|------|----------|
| Prisma migrations, security, seed data | [`../prisma/migrations-guide.md`](../prisma/migrations-guide.md), [`../prisma/SECURITY.md`](../prisma/SECURITY.md), [`../prisma/seed-data.md`](../prisma/seed-data.md) |
| Vitest suite structure | [`../tests/README.md`](../tests/README.md), [`../tests/vitest/README.md`](../tests/vitest/README.md) |
| Performance benchmark runner | [`../tests/performance/README.md`](../tests/performance/README.md), [`../tests/performance/query-budget-benchmarks.md`](../tests/performance/query-budget-benchmarks.md) |
| Localization (i18n) | [`../localization/README.md`](../localization/README.md), [`../localization/docs/`](../localization/docs/) |

## Source Of Truth Rules

Do not duplicate detailed rules that belong beside executable assets. When a rule is
specific to a folder, keep the detailed rule in that folder and cross-link from `docs/`.

| Rule area | Canonical location | `docs/` role |
|-----------|--------------------|--------------|
| Code and file placement | [`code-standards.md`](code-standards.md), [`codebase-summary.md`](codebase-summary.md) | Keep broad conventions and feature map only. |
| Page and feature UI composition | [`Architecture/frontend-ui-architecture/page-composition-conventions.md`](Architecture/frontend-ui-architecture/page-composition-conventions.md) | Link and summarize only. |
| API implementation and contracts | [`API/api-implementation-conventions.md`](API/api-implementation-conventions.md), [`API/api-index.md`](API/api-index.md) | Keep detailed route behavior in API docs. |
| Prisma migration procedure | [`../prisma/migrations-guide.md`](../prisma/migrations-guide.md), [`../prisma/SECURITY.md`](../prisma/SECURITY.md) | Link and summarize only. |
| Test suite structure | [`../tests/README.md`](../tests/README.md) | Link and summarize only. |
| Performance query budgets | [`../tests/performance/query-budget-benchmarks.md`](../tests/performance/query-budget-benchmarks.md), [`../tests/performance/README.md`](../tests/performance/README.md) | Link and summarize only. |
