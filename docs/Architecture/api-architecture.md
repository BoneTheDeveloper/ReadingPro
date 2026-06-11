# API Architecture

## Layers

```text
route.ts
  -> schema/DTO validation
  -> getAuthenticatedUser when required
  -> src/lib/<domain> service or repository
  -> JSON response or stream
```

## Conventions

- Route files stay in `src/app/api/**/route.ts`.
- Zod schemas live in the route when local to the route.
- Shared API schemas live under `src/lib/<domain>/shared` when reused across routes, services, clients, or tests.
- Route-owned business workflows live under `src/lib/<domain>/**`, not `src/features/**`.
- Route handlers should return `{ success: true, data }` for success and `{ error }` for failures.
- Streaming routes document their exception in route docs.

## Service/Repository Boundary

| Layer | Responsibility |
|-------|----------------|
| Route | HTTP details, validation, auth, response status. |
| Service | Business workflow, provider orchestration, ownership-sensitive domain flow. Lives in `src/lib/<domain>`. |
| Repository/query module | Prisma/raw SQL access and persistence details. Lives in `src/lib/<domain>` or `src/lib/db`. |
| DTO builder/schema | Public API shape when database rows differ from client contracts. Lives in `src/lib/<domain>/shared` or near the owning service. |

`src/features` may call services through server actions, but it should not own route services or repositories. Feature modules are the UI/action shell; `src/lib` is the API/domain implementation layer.

## Placement Examples

```text
src/app/api/dictionary/lookup/route.ts
  -> src/lib/dictionary/lookup/lookup.service.ts
  -> src/lib/dictionary/lookup/lookup.repository.ts
  -> src/lib/dictionary/shared/dictionary-response-schema.ts

src/app/api/study-questions/route.ts
  -> src/lib/study/passage/passage-study.service.ts
  -> src/lib/study/shared/study-response-schema.ts

src/features/study/actions/study-generate-questions-action.ts
  -> src/lib/study/passage/passage-study.service.ts
```

## Implemented Route Groups

- Upload: `/api/upload`, `/api/upload/text`
- Translation/vocabulary: `/api/translate`, `/api/vocabulary`
- Dictionary: `/api/dictionary/*`
- Study chat/session: `/api/study-chat`, `/api/study-session`
- Cards/progress: `/api/cards/*`, `/api/progress/stats`
- Health/dev/test: `/api/health`, `/api/local-blob/[pathname]`, `/api/test/*`

See [../API/api-index.md](../API/api-index.md).
