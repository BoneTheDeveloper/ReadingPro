# API Architecture

## Layers

```text
route.ts
  -> schema/DTO validation
  -> getAuthenticatedUser when required
  -> service or repository
  -> JSON response or stream
```

## Conventions

- Route files stay in `src/app/api/**/route.ts`.
- Zod schemas live in the route when local to the route.
- Shared service schemas can live near their service.
- Route handlers should return `{ success: true, data }` for success and `{ error }` for failures.
- Streaming routes document their exception in route docs.

## Service/Repository Boundary

| Layer | Responsibility |
|-------|----------------|
| Route | HTTP details, validation, auth, response status. |
| Service | Business workflow and provider orchestration. |
| Repository/query module | Prisma/raw SQL access and persistence details. |
| DTO builder | Public API shape when database rows differ from client contracts. |

## Implemented Route Groups

- Upload: `/api/upload`, `/api/upload/text`
- Translation/vocabulary: `/api/translate`, `/api/vocabulary`
- Dictionary: `/api/dictionary/*`
- Study chat/session: `/api/study-chat`, `/api/study-session`
- Cards/progress: `/api/cards/*`, `/api/progress/stats`
- Health/dev/test: `/api/health`, `/api/local-blob/[pathname]`, `/api/test/*`

See [../API/api-index.md](../API/api-index.md).
