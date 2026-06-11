# Code Standards

## Architecture Rules

- Keep Next.js route handlers thin: parse, authenticate, call service/repository, return response.
- Put product-facing feature code under `src/features/<feature>/`: UI, hooks, client state, client API helpers, and server actions.
- Put backend/domain/runtime code under `src/lib/`: route services, repositories, DTO/schema contracts, provider orchestration, DB helpers, auth, storage, AI, algorithms, observability, and reusable domain modules.
- Avoid feature-to-feature imports. If more than one feature or an API route needs the logic, move it to `src/lib/<domain>/`.
- Treat `src/features` as the interaction shell and `src/lib` as the durable implementation layer.
- Keep generated Prisma code isolated under `src/generated/prisma/`.
- Keep folder-specific rule docs beside their executable assets. `docs/` should link to `prisma/` and `tests/` rule docs instead of duplicating them.

## Folder Scope

| Folder | Owns | Must not own |
|--------|------|--------------|
| `src/app` | Next.js pages, layouts, route handlers, route groups, loading/error boundaries. | Business workflows, provider fallback logic, DB query details. |
| `src/app/api/**/route.ts` | HTTP boundary: parse input, validate, authenticate, map status codes, return response. | Raw SQL, AI/provider orchestration, ranking logic, complex DTO assembly. |
| `src/features/<feature>` | User-facing feature shell: components, hooks, browser/client state, client API wrappers, server actions. | Route-owned backend services, repositories, shared API schemas, complex fetch logic inside components. |
| `src/lib/<domain>` | Domain/runtime implementation: services, repositories, DTO builders, shared schemas, provider workflows. | React UI, browser-only hooks, page layout code. |
| `src/lib/<domain>/shared` | Stable API DTOs, response schemas, domain constants shared by route/service/client tests. | UI-only types or component props. |
| `src/components` | Shared UI primitives and layout components. | Feature-specific business workflows. |

Examples:

- Dictionary lookup route: `src/app/api/dictionary/lookup/route.ts` calls `src/lib/dictionary/lookup/lookup.service.ts`.
- Study question route: `src/app/api/study-questions/route.ts` calls `src/lib/study/passage/passage-study.service.ts`.
- Study workspace UI, hooks, and server actions remain under `src/features/study`.

## TypeScript

- Use strict TypeScript.
- Prefer explicit input/output types for service boundaries.
- Use `unknown` plus narrowing instead of `any`.
- Use Zod for external input: route bodies, query params, server action payloads, generated AI JSON.
- Keep runtime DTOs close to the route/service that owns the contract.

## Next.js Boundaries

- Default to Server Components for pages and layouts.
- Add `"use client"` only for browser state, effects, refs, event handlers, browser APIs, or streaming UI hooks.
- Client components should render UI, own browser interaction state, and call feature hooks/actions/client API helpers.
- Client components should not own API contract parsing, non-trivial URL construction, retry/cache/dedupe rules, persistence decisions, or domain transformations.
- Put browser-side fetch wrappers under the feature module, for example `src/features/<feature>/<feature>-api.ts` or `src/features/<feature>/use-*.ts`.
- Route handlers live in `src/app/api/**/route.ts`.
- Server actions stay in feature modules when they are invoked by a feature UI, but shared business work they call belongs in `src/lib/<domain>`.
- API routes and server actions must not trust client-provided ownership fields.

Preferred client data flow:

```text
Client component
  -> feature hook or client API helper
      -> fetch / server action
          -> route handler
              -> src/lib/<domain> service
```

## Data Access

- Import `db` from `@/lib/db/client`.
- Query modules under `src/lib/db/*-queries.ts` own app-domain Prisma access.
- Dictionary repositories may use raw SQL when required for performance or grouping correctness.
- Always include `userId` in user-owned reads/writes.
- Use soft deletion for passages through `deletedAt`.
- Select only fields needed for public/API DTOs.

## API Contracts

- Successful JSON responses use `{ success: true, data }` unless the route is a streaming route.
- Failed JSON responses use `{ error: string }` with an appropriate status.
- Auth failures should return `401`.
- Missing owned resources should return `404`.
- Validation failures should return `400`.

## Observability

- Use `createRequestLogger` in route handlers when request context is useful.
- Use `log.error({ err: error }, message)` for server-side errors.
- Capture route failures with `Sentry.captureException(error, { tags: { route, method } })`.
- Use `Sentry.startSpan` around meaningful auth, DB, storage, and AI steps.
- Use performance headers only behind explicit performance fixture/header gates.

## Naming

| Kind | Convention |
|------|------------|
| Components/hooks/services | kebab-case files |
| Next pages/layouts/routes | Next.js file conventions |
| Docs | kebab-case, except existing `Api-*` files retained for compatibility |
| Tests | colocated `*.test.ts` / `*.test.tsx` |

**Status:** Active
**Last Updated:** 2026-06-11
