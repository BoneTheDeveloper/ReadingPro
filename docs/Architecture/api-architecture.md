# API Architecture

## Layers

```text
route.ts
  -> schema/DTO validation
  -> getAuthenticatedUser when required
  -> feature service or src/server/modules/<domain> service
  -> JSON response or stream
```

## Conventions

- Route files stay in `src/app/api/**/route.ts`.
- Zod schemas live in the route when local to the route.
- Shared API schemas live under `src/contracts/<domain>` when reused across routes, services, clients, or tests.
- Reusable route-owned business workflows live under `src/server/modules/<domain>/**`.
- Feature-specific use-case workflows may live under `src/features/<feature>/services` when they are not reused outside that feature.
- Route handlers should return `{ success: true, data }` for success and `{ error }` for failures.
- Streaming routes document their exception in route docs.

## Service/Repository Boundary

| Layer | Responsibility |
|-------|----------------|
| Route | HTTP details, validation, auth, response status. |
| Feature service | Single-feature use-case workflow. Lives in `src/features/<feature>/services`. |
| Domain service | Reusable business workflow, provider orchestration, ownership-sensitive domain flow. Lives in `src/server/modules/<domain>`. |
| Repository/query module | Prisma/raw SQL access and persistence details. Lives in `src/server/modules/<domain>` or legacy `src/server/db`. |
| DTO builder/schema | Public API shape when database rows differ from client contracts. Lives in `src/contracts/<domain>` or near the owning service. |

Feature modules may own services that belong to one feature or use case. Reusable domain services and all repository/database access should live in `src/server/modules/<domain>`.

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

src/app/api/studio-questions/route.ts
  -> src/server/modules/study/passage/passage-study.service.ts
  -> src/contracts/study/study-response-schema.ts

src/app/api/study-results/route.ts
  -> src/server/modules/study/passage/study-results-service.ts

src/app/api/studio-artifacts/route.ts
  -> src/server/modules/study/passage/studio-artifacts-service.ts
  -> src/contracts/study/studio-artifact-types.ts

src/features/study/actions/study-generate-questions-action.ts
  -> src/server/modules/study/passage/passage-study.service.ts

src/features/study/ui/upload/study-upload-modal.tsx
  -> src/features/upload/actions/create-uploaded-passage.action.ts
  -> src/features/upload/services/create-uploaded-passage.ts
  -> src/server/modules/upload/passage-create/passage-create.service.ts
  -> src/server/db/passage-queries.ts
```

## Implemented Route Groups

- Upload: `/api/upload`, `/api/upload/text`
- Translation/vocabulary: `/api/translate`, `/api/vocabulary`
- Dictionary: `/api/dictionary/*`
- Study chat/session: `/api/study-chat`, `/api/study-session`
- Study results: `/api/study-results`
- Studio artifacts: `/api/studio-artifacts` (quiz outcomes persist as a `QuizResult` child of a `StudioArtifact` via server actions, not a dedicated route)
- Cards/progress: `/api/cards/*`, `/api/progress/stats`
- Health/dev/test: `/api/health`, `/api/local-blob/[pathname]`, `/api/test/*`

See [../API/api-index.md](../API/api-index.md).
