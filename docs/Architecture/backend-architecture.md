# Backend Architecture

How backend logic is layered and **where each piece of code lives** — the service,
repository, and domain-module placement rules.

> **Scope.** This doc owns backend **code placement**. It does not own HTTP route conventions
> (response shape, Zod, auth handling) — those live in
> [`../API/api-implementation-conventions.md`](../API/api-implementation-conventions.md) — nor
> the route inventory, which lives in [`../API/api-index.md`](../API/api-index.md).

## Service/Repository Boundary

| Layer | Responsibility |
|-------|----------------|
| Route | HTTP details, validation, auth, response status. HTTP adapter only — see [API conventions](../API/api-implementation-conventions.md). |
| Feature service | Single-feature use-case workflow. Lives in `src/features/<feature>/services`. |
| Domain service | Reusable business workflow, provider orchestration, ownership-sensitive domain flow. Lives in `src/server/modules/<domain>`. |
| Repository/query module | Prisma/raw SQL access and persistence details. Lives in `src/server/modules/<domain>` or legacy `src/server/db`. |
| DTO builder/schema | Public API shape when database rows differ from client contracts. Lives in `src/contracts/<domain>` or near the owning service. |

Feature modules may own services that belong to one feature or use case. Reusable domain
services and all repository/database access should live in `src/server/modules/<domain>`.

Do not create `src/server/services`. Group services by feature or domain.

## Service Placement Rule

- If a service is used by only one feature, keep it inside `src/features/<feature>/services`.
- If a service represents reusable domain/business logic, move it to `src/server/modules/<domain>`.
- If a service depends on UI state, React hooks, or page-specific behavior, it must stay in `src/features`.
- If a service performs database/domain operations that should be reused outside one feature, it belongs in `src/server/modules/<domain>`.
- If a service only wraps a client-side API call, put it in `src/features/<feature>/api-client`, not in `src/server/modules`.
- Repository/database access should live under `src/server/modules/<domain>`.

## Placement Examples

```text
src/app/api/dictionary/lookup/route.ts
  -> src/server/modules/dictionary/lookup/lookup.service.ts
  -> src/server/modules/dictionary/lookup/lookup.repository.ts
  -> src/server/modules/dictionary/shared/dictionary-response-schema.ts

src/app/api/study/studio/questions/route.ts
  -> src/server/modules/study/passage/passage-study.service.ts
  -> src/contracts/study/study-response-schema.ts

src/app/api/study/studio/artifacts/route.ts
  -> src/server/modules/study/passage/studio-artifacts-service.ts
  -> src/contracts/study/studio-artifact-types.ts

## Related docs

- HTTP route handler rules (response shape, Zod, auth): [`../API/api-implementation-conventions.md`](../API/api-implementation-conventions.md)
