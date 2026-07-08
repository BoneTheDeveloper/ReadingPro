# Code Standards

For the source layout, feature list, and API endpoint inventory, see `codebase-summary.md`.
This document defines the **rules** every feature slice must follow.

## Query Architecture (Request/Response Data Flow)

All API data flows follow a strict layering pattern so the wire contract cannot silently drift
from the database schema. Every layer lives inside the feature slice (`src/features/<feature>/`).

### Data Flow Diagram

```
Request → [Client] ──── fetch ────> [API Route]
                                       │
                             zod.safeParse(requestSchema)
                                       │
                                       ▼
                                  [Service]
                                       │
                              calls repository
                                       │
                                       ▼
                                [Repository]
                                       │
                                  Prisma query
                                       │
                                       ▼
                                      DB

Response ← [Client] <──── json ──── <[API Route]
           │
    safeParse(responseSchema)
           │
           ▼
        render
```

### Request/Response Envelope Format

All API responses follow this envelope pattern:

```typescript
// Success
{ success: true, data: <SchemaType> }

// Performance variant (with timing metrics)
{ success: true, data: <SchemaType>, performance: { ... } }

// Error
{ error: "Human-readable message", code?: "ERROR_CODE" }
```

## Layer Responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Schemas** | `features/<f>/schemas/*.schema.ts` | Zod schemas defining the wire shape (`.strict()`) **and** the inferred types (`z.infer<...>`) exported alongside them. Single source of truth — import types directly from here; there is no separate `*-dtos` file. Schema files use the `*.schema.ts` suffix. |
| **HTTP Envelope** | `lib/http/api-response.schema.ts` | Shared builders: `makeSuccessEnvelopeSchema`, `makeResponseSchema`, `makePerformanceEnvelopeSchema`, `apiErrorResponseSchema`. Every feature wraps its data schema with these. |
| **Request Helpers** | `lib/http/api-request.ts` | Client-side fetch wrappers (`getJson`, `postJson`, `patchJson`, `deleteJson`). All methods accept a Zod schema and return typed results. |
| **Repository** | `features/<f>/db/*-repository.ts` | Prisma/SQL access only. Returns Prisma models or raw rows. Never imports from `schemas/`. |
| **Service** | `features/<f>/services/*-service.ts` | Business logic. Calls the repository and converts output to the DTO type from `schemas/` before returning. Contains inline `toDto()` mappers and throws service-specific errors. |
| **API Route** | `app/api/**/route.ts` | Parses request with a zod request schema; calls exactly one service; wraps the returned DTO in the envelope; translates errors to HTTP status codes. |
| **Frontend Client** | `features/<f>/*-client.ts` | Fetch wrapper. Uses raw `fetch` + `safeParse` or delegates to `lib/http` helpers. Validates response with `responseSchema.safeParse(json)` and throws on `"error" in json`. |

## Layer Boundaries (Rules)

- **Schema is the source of truth.** Types are `z.infer<typeof schema>`. No parallel hand-written type definitions.
- **Service owns DTO building.** It is the single point where repository output becomes the wire contract. If the Prisma schema changes, the DTO return-type annotation must fail to compile.
- **Routes never touch the repository.** A route delegates all logic to one service; it does not shape response data.
- **Repositories never import `schemas/`.** DB access stays free of wire-contract concerns.
- **Clients always `safeParse`.** No blind `as Type` casts on responses.
- **Domain errors are service-specific.** Services throw typed errors (`VocabularyServiceError`, `UploadWorkflowError`, etc.) that routes catch and translate to HTTP status codes.
- **Request logging is route-level.** Each route creates a request logger via `createRequestLogger` and passes it to `toHttp` for centralized error translation.
- **No cross-feature re-exports.** Types belong to their owning feature. Do not re-export types from other features via a shared/types.ts file.

## Schema Naming Conventions

```typescript
// Entity schemas (data transfer objects)
export const vocabularyItemSchema = z.object({ ... }).strict();
export type VocabularyItemDto = z.infer<typeof vocabularyItemSchema>;

// Request/response schemas (wire contracts)
export const vocabularyRequestSchema = z.object({ ... }).strict();
export const vocabularyItemResponseSchema = makeResponseSchema(vocabularyItemSchema);
export type VocabularyItemResponse = z.infer<typeof vocabularyItemResponseSchema>;

// Enum schemas (shared values)
export const vocabularyStatusSchema = z.enum(["NEW", "LEARNING", "MASTERED"]);
export type VocabularyStatus = z.infer<typeof vocabularyStatusSchema>;
```

### Response Schema Pattern

Each feature should export these response schemas:

```typescript
// For single-item endpoints
export const vocabularyItemResponseSchema = makeResponseSchema(VocabularyItemSchema);

// For list endpoints
export const vocabularyListResponseSchema = makeResponseSchema(
  z.object({
    items: z.array(VocabularyItemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  })
);

// For endpoints that may return error-only response
export const vocabularyAckResponseSchema = z.union([
  z.object({ success: z.literal(true) }).strict(),
  apiErrorResponseSchema,
]);
```

## Service Error Pattern

Services define their own error classes for domain-specific failures:

```typescript
// In features/<f>/services/<f>-service.ts
export class VocabularyServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VocabularyServiceError";
  }
}

export class UploadWorkflowError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
    this.name = "UploadWorkflowError";
  }
}
```

Routes catch service errors and handle them explicitly:

```typescript
try {
  const result = await someService(input);
  return NextResponse.json({ success: true, data: result });
} catch (error) {
  if (error instanceof UploadWorkflowError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return toHttp(error, log, "api:route-name");
}
```

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
2. Call `toHttp(error, log, "api:<route-id>")` — the single boundary that translates:
   - `AuthenticationRequiredError` → 401
   - `NotFoundError` → 404
   - `ZodError` → 400
   - Everything else → log + Sentry + 500 `{ error: "Internal error." }`

## Type Safety

- All DTO types must be inferred from zod schemas via `z.infer<typeof schema>`.
- Never derive a DTO with `Omit<PrismaModel, ...>` — new columns would leak unreviewed.
- Service return-type annotations must explicitly match the DTO type, so a schema change breaks compilation at the boundary.
