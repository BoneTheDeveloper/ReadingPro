# Code Standards

For the source layout, feature list, and API endpoint inventory, see `codebase-summary.md`.
This document defines the **rules** every feature slice must follow.

## Query Architecture (Request/Response Data Flow)

All API data flows follow a strict layering pattern so the wire contract cannot silently drift
from the database schema. Every layer lives inside the feature slice (`src/features/<feature>/`);
the shared HTTP envelope lives in `src/lib/http/`.

```
Frontend client            API route (app/api/**)      Service (features/<f>/services)   Repository (features/<f>/db)   DB
   │                          │                              │                                  │              │
   │─ postJson(body) ────────>│                              │                                  │              │
   │                          │ zod.parse(request schema)    │                                  │              │
   │                          │─ validated input ───────────>│                                  │              │
   │                          │                              │─ calls repository ──────────────>│─ Prisma ────>│
   │                          │                              │<─ Prisma model / rows ───────────│<─────────────│
   │                          │                              │─ maps rows → DTO (dto-builders)  │              │
   │                          │<─ DTO (matches schema type) ─│                                  │              │
   │<─ { success, data: DTO } │  wrap in envelope (lib/http/api-response.schema.ts)             │              │
   │  responseSchema.safeParse(json)                                                            │              │
   │  render DTO              │                                                                 │              │
```

## Layer Responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Schemas** | `features/<f>/schemas/*.schema.ts` | Zod schemas defining the wire shape (`.strict()`) **and** the inferred types (`z.infer<...>`) exported alongside them. Single source of truth — import types directly from here; there is no separate `*-dtos` file. Schema files use the `*.schema.ts` suffix. |
| **HTTP Envelope** | `lib/http/api-response.schema.ts` | Shared builders: `makeSuccessEnvelopeSchema`, `makeResponseSchema`, `makePerformanceEnvelopeSchema`, `apiErrorResponseSchema`. Every feature wraps its data schema with these. |
| **Repository** | `features/<f>/db/*-repository.ts` | Prisma/SQL access only. Returns Prisma models or raw rows. Never imports from `schemas/`. |
| **Service** | `features/<f>/services/*-service.ts` | Business logic. Calls the repository and converts output to the DTO type from `schemas/` before returning. Mandatory boundary. |
| **DTO Builders** | `features/<f>/services/dto-builders.ts` | Optional shared mappers. Take a minimal input shape and declare an explicit DTO return type. |
| **API Route** | `app/api/**/route.ts` | Parses request with a zod request schema; calls exactly one service; wraps the returned DTO in the envelope; translates errors to HTTP status codes. |
| **Frontend Client** | `features/<f>/<f>-client.ts` | Fetch wrapper (`postJson`/`patchJson`/… from `lib/http`). Validates the response with `responseSchema.safeParse(json)`. |

## Layer Boundaries (Rules)

- **Schema is the source of truth.** Types are `z.infer<typeof schema>`. No parallel hand-written type definitions.
- **Service owns DTO building.** It is the single point where repository output becomes the wire contract. If the Prisma schema changes, the DTO return-type annotation must fail to compile.
- **Routes never touch the repository.** A route delegates all logic to one service; it does not shape response data.
- **Repositories never import `schemas/`.** DB access stays free of wire-contract concerns.
- **Clients always `safeParse`.** No blind `as Type` casts on responses.

## File Naming Conventions

- **Kebab-case** for all file names (`lookup-service.ts`, `dictionary-client.ts`, not `lookupService.ts`).
- **Descriptive names** — LLM tools (Grep, Glob) should understand a file's purpose from its name alone.
- **File size limit** — keep files under 200 lines; modularize beyond that.

## Error Handling

Domain errors are raised as typed exceptions at the repo/service layer:
- `NotFoundError` (in `lib/http/route-errors.ts`) — thrown when a resource does not exist or is not owned by the caller; merges both cases so non-owners cannot distinguish missing from forbidden.
- Service-specific errors (e.g., `VocabularyServiceError`, `UploadWorkflowError`) — carry domain-specific status codes.

API routes catch errors in a thin try/catch:
1. `instanceof` check for domain errors with non-standard status codes, map them explicitly.
2. Call `toHttp(error, requestLog, "api:<route-id>")` — the single boundary that translates:
   - `AuthenticationRequiredError` → 401
   - `NotFoundError` → 404
   - `ZodError` → 400
   - Everything else → log + Sentry + 500 `{ error: "Internal error." }`

## Type Safety

- All DTO types must be inferred from zod schemas via `z.infer<typeof schema>`.
- Never derive a DTO with `Omit<PrismaModel, ...>` — new columns would leak unreviewed.
- Service return-type annotations must explicitly match the DTO type, so a schema change breaks compilation at the boundary.
