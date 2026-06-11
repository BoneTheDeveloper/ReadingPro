# Code Standards

## Architecture Rules

- Keep Next.js route handlers thin: parse, authenticate, call service/repository, return response.
- Put product-facing feature code under `src/features/<feature>/`: UI, hooks, client state, client API helpers, server actions, and feature-specific services.
- Put reusable backend/domain/runtime code under `src/lib/<domain>/`: shared domain services, repositories, DTO/schema contracts, provider orchestration, DB helpers, auth, storage, AI, algorithms, observability, and reusable domain modules.
- Avoid feature-to-feature imports. If more than one feature, API route, server action, or background job needs the logic, move it to `src/lib/<domain>/`.
- Treat `src/features` as the feature/use-case layer and `src/lib/<domain>` as the reusable domain implementation layer.
- Do not create a generic `src/lib/services` folder. Services must be grouped by owning feature or domain.
- Keep generated Prisma code isolated under `src/generated/prisma/`.
- Keep folder-specific rule docs beside their executable assets. `docs/` should link to `prisma/` and `tests/` rule docs instead of duplicating them.

## Folder Scope

| Folder | Owns | Must not own |
|--------|------|--------------|
| `src/app` | Next.js pages, layouts, route handlers, route groups, loading/error boundaries. | Business workflows, provider fallback logic, DB query details. |
| `src/app/api/**/route.ts` | HTTP boundary: parse input, validate, authenticate, map status codes, return response. | Raw SQL, AI/provider orchestration, ranking logic, complex DTO assembly. |
| `src/features/<feature>` | Feature/use-case implementation: components, hooks, browser/client state, client API wrappers, server actions, feature-specific services. | Shared domain services, repositories, shared API schemas, cross-feature business workflows, complex fetch logic inside components. |
| `src/features/<feature>/services` | Services used only by that feature or use case. | Reusable domain services, repository/database access that should be shared outside the feature. |
| `src/features/<feature>/api` | Client-side API wrappers and fetch helpers. | Domain services, repositories, server-only provider orchestration. |
| `src/lib/<domain>` | Shared domain/runtime implementation: services, repositories, DTO builders, shared schemas, provider workflows. | React UI, browser-only hooks, page layout code, page-specific behavior. |
| `src/lib/<domain>/services` | Reusable domain/business services shared by multiple features, API routes, server actions, or jobs. | Feature-only services, UI-state-dependent logic. |
| `src/lib/<domain>/repositories` | Prisma/raw SQL access and persistence details for a domain. | UI code, API response rendering, feature-specific state. |
| `src/lib/<domain>/shared` | Stable API DTOs, response schemas, domain constants shared by route/service/client tests. | UI-only types or component props. |
| `src/components` | Shared UI primitives and layout components. | Feature-specific business workflows. |

Examples:

- Dictionary lookup route: `src/app/api/dictionary/lookup/route.ts` calls `src/lib/dictionary/lookup/lookup.service.ts`.
- Study question route: `src/app/api/study-questions/route.ts` calls `src/lib/study/passage/passage-study.service.ts`.
- Study workspace UI, hooks, and server actions remain under `src/features/study`.
- Upload use-case services belong under `src/features/upload/services` until they become reusable outside upload.
- Reusable passage creation, reads, ownership checks, and passage repository access belong under `src/lib/passages`.

## Feature Folder Convention

Feature folders should use this structure when the feature has enough code to justify the split:

```text
src/features/<feature>
+-- ui
|   +-- React components, panels, modals, rows, cards, page sections
+-- model
|   +-- feature types, state hooks, reducers, state machines, pure utilities
+-- api
|   +-- client-side API wrappers, fetch helpers, browser response parsing
+-- actions
|   +-- server actions invoked by feature UI
+-- services
|   +-- single-feature use-case services
+-- index.ts
    +-- optional public export surface
```

Folder ownership:

| Folder | Owns | Must not own |
|--------|------|--------------|
| `ui` | React components, feature page clients, panels, modals, rows, cards, page sections. | DB access, domain services, cross-feature state, route handlers. |
| `model` | Feature types, UI state hooks, reducers, client state machines, pure UI/domain utilities. | React components, server actions, fetch wrappers, repositories. |
| `api` | Client-side API wrappers, fetch helpers, browser response parsing, request builders. | Server-only DB/provider logic, reusable domain services. |
| `actions` | Server actions called from feature UI; auth/ownership guards before feature mutations. | React state, visual rendering, reusable domain repositories. |
| `services` | Services used only by this feature/use case. | Reusable domain logic, repository/database access that should be shared outside the feature. |
| `index.ts` | Optional stable exports for external consumers. | A dumping ground for all internals. |

Rules:

- Do not create empty folders just to match the template.
- Keep small features flat until the split improves clarity.
- Use `ui/`, `model/`, `api/`, `actions/`, and `services/` once a feature has multiple files in that concern.
- Feature folders may import shared UI primitives from `src/components/ui`.
- Feature folders may call reusable domain services from `src/lib/<domain>/services`.
- Feature folders must not import repositories directly unless the repository is explicitly feature-local, which should be rare.
- Avoid feature-to-feature imports. Extract shared capability or shared domain logic first.

Study target shape:

```text
src/features/study
+-- ui
|   +-- study-workspace-client.tsx
|   +-- sources-panel.tsx
|   +-- upload
|   |   +-- study-upload-modal.tsx
|   +-- studio
|       +-- studio-panel.tsx
|       +-- content
|       +-- chat
|       +-- quiz
|       +-- translate
+-- model
|   +-- types.ts
|   +-- use-study-workspace-state.ts
|   +-- use-study-panel-layout.ts
|   +-- use-study-actions.ts
|   +-- selection-utils.ts
+-- api
|   +-- study-api.ts
+-- actions
    +-- study-simplify-action.ts
    +-- study-generate-questions-action.ts
    +-- study-delete-passage-action.ts
```

Upload target shape:

```text
src/features/upload
+-- ui
|   +-- upload-form.tsx
|   +-- upload-zone.tsx
|   +-- text-input-area.tsx
+-- model
|   +-- upload.schema.ts
|   +-- upload.types.ts
+-- actions
|   +-- create-uploaded-passage.action.ts
+-- services
|   +-- create-uploaded-passage.ts
+-- api
    +-- upload-api.ts
```

## Service Placement Rule

Use `src/features/<feature>/services` for services that belong to a specific feature or use case.

Use `src/lib/<domain>/services` for domain services that are shared across multiple features, API routes, server actions, or background jobs.

Do not put every service into a generic `src/lib/services` folder. Services should be grouped by domain so ownership is clear.

Rules:

- If a service is used by only one feature, keep it inside that feature.
- If a service represents reusable domain/business logic, move it to `src/lib/<domain>/services`.
- If a service depends on UI state, React hooks, or page-specific behavior, it must stay in `src/features`.
- If a service performs database/domain operations that should be reused outside one feature, it belongs in `src/lib/<domain>`.
- If a service only wraps a client-side API call, put it in `src/features/<feature>/api`, not in `src/lib`.
- Repository/database access should live under `src/lib/<domain>/repositories`.

Upload example:

```text
StudyUploadModal
  -> createUploadedPassageAction
    -> createUploadedPassageService
      -> createPassageService
        -> passageRepository
```

Ownership:

- `src/features/upload` owns upload input validation, file/text normalization, upload-specific workflow, `createUploadedPassageAction`, and `createUploadedPassageService`.
- `src/lib/passages` owns reusable Passage domain logic: creating a passage, reading passages, checking passage ownership, and passage repository/database access.

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
- Server actions stay in feature modules when they are invoked by a feature UI. Feature-specific business work may live in `src/features/<feature>/services`; shared domain work belongs in `src/lib/<domain>/services`.
- API routes and server actions must not trust client-provided ownership fields.

Preferred client data flow:

```text
Client component
  -> feature hook or client API helper
      -> fetch / server action
          -> route handler
              -> feature service or src/lib/<domain> service
```

## Data Access

- Import `db` from `@/lib/db/client`.
- Repositories under `src/lib/<domain>/repositories` own domain Prisma/raw SQL access.
- Existing query modules under `src/lib/db/*-queries.ts` are legacy/shared DB access modules and should migrate toward domain repositories when touched.
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
