# Code Standards

## Purpose

This file is the top-level convention for writing code and placing files. Keep it broad. Detailed rules belong in the owning architecture, API, testing, database, operations, or folder-local docs.

Use these docs as the source of truth for details:

| Area | Canonical doc |
|------|---------------|
| Codebase map and feature ownership | [codebase-summary.md](codebase-summary.md) |
| Runtime and Next.js boundaries | [Architecture/runtime-architecture.md](Architecture/runtime-architecture.md) |
| Page and feature UI composition | [Architecture/frontend-ui-architecture/page-composition-conventions.md](Architecture/frontend-ui-architecture/page-composition-conventions.md) |
| API route implementation | [API/api-implementation-conventions.md](API/api-implementation-conventions.md) |
| API route docs and contracts | [API/api-index.md](API/api-index.md) |
| Database and migrations | [Architecture/database-architecture.md](Architecture/database-architecture.md), [../prisma/migrations-guide.md](../prisma/migrations-guide.md) |
| Testing | [Testing/testing-strategy.md](Testing/testing-strategy.md) |
| Root/config file placement | repo root, next to `package.json` |

## General Principles

- Keep boundaries explicit: UI, feature orchestration, API boundaries, domain logic, persistence, and operations should live in their owning layers.
- Prefer the existing project pattern over inventing a new shape.
- Move shared contracts into `src/shared/<domain>` and backend logic into `src/server/modules/<domain>`.
- Keep framework boundary files thin: pages compose features, routes expose HTTP, features communicate via standard API calls.
- Keep generated code, migrations, tests, scripts, and documentation in their existing owning directories.
- Do not duplicate detailed contracts or procedures in this file. Link to the canonical doc instead.

## Source Layout

| Area | Use for |
|------|---------|
| `src/app` | Next.js route boundaries: pages, layouts, thin API route handlers (HTTP adapters). |
| `src/server` | Backend layer (enforced `server-only`): database access, AI orchestration, auth logic, and core business services (`modules`). |
| `src/shared` | Contract layer (pure): Zod schemas, DTOs, and isomorphic utilities used by both client and server. |
| `src/features/<feature>` | Frontend feature layer (FSD-lite): UI, hooks, model, and feature-specific API clients. |
| `src/components` | Shared presentation primitives (UI atoms) and layout components. |
| `prisma` | Modular Prisma schemas, migrations, and seed data. |
| `tests`, `playwright` | Test suites and runner-owned helpers/config. |
| `docs` | Current human and agent-readable source-of-truth docs. |
| `plans`, `docs/journals` | Historical planning and implementation records, not current source-of-truth docs. |

## File Placement Rules

- Put code where its owner is clearest, not where it is first needed.
- Keep small features flat until splitting improves readability.
- Use feature subfolders `ui`, `hooks`, `model`, and `api` to organize feature-specific frontend logic.
- Do not create generic catch-all folders like `src/server/services`.
- Put reusable persistence and backend domain work under `src/server/modules/<domain>`.
- Put shared API contracts and DTO types under `src/shared/<domain>`.
- Put client-side fetch wrappers under the owning feature's `api/` directory.
- Keep tool-specific config beside the owning tool unless the tool requires root discovery.

## Code Style

- Use strict TypeScript and avoid `any`; prefer `unknown` plus narrowing at external boundaries.
- Prefer explicit input and output types at service, route, and shared helper boundaries.
- Use Zod for untrusted input and generated structured output.
- Keep functions small enough that ownership, side effects, and failure paths are obvious.
- Name code by product role or domain responsibility, not by layout position or implementation trivia.
- Add comments only when they clarify non-obvious constraints, invariants, or cross-layer decisions.

## Boundary Rules

- **UI Components:** Render UI and own browser interaction state.
- **Feature Hooks:** Coordinate feature state, client API calls, and page-level interactions.
- **Feature API:** Frontend fetch clients that centralize calls to `/api/*` routes.
- **API Route Handlers:** Thin HTTP adapters that parse, validate, authenticate, and delegate to server modules.
- **Server Modules:** Own reusable business workflows, provider orchestration, and persistence.
- **Repositories:** Own database access (Prisma/raw SQL).
- **Shared Schemas:** Define the contracts between frontend and backend.

## Naming

| Kind | Convention |
|------|------------|
| TypeScript source files | Follow local feature/domain style; prefer kebab-case for new non-component files. |
| React components | PascalCase exports; filenames should match local convention. |
| Hooks | `use-*` names for React hooks. |
| Next.js files | Follow Next.js reserved filenames. |
| Tests | Follow the owning test runner docs. |
| Docs | Kebab-case for new evergreen docs. |
| Plans and journals | Timestamped historical records in their existing folders. |

## Change Checklist

Before adding or moving code:

- Is this feature-only, shared domain logic, or framework boundary code?
- Is there an existing folder/doc that already owns this convention?
- Will this create a feature-to-feature dependency that should become shared domain code instead?
- Are API/database/test details documented in their canonical docs instead of duplicated here?
- Are generated files and historical records left alone unless the task explicitly targets them?

**Status:** Active
**Last Updated:** 2026-06-11
