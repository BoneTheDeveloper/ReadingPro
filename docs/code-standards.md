# Code Standards

For source layout and features, see `codebase-summary.md`.
For observability, see `Architecture/observability.md`.

## Data Access Patterns

### Server Actions (mutations)

```
Client (useActionState) → Server Action → Service → Repository → DB
```

| Layer | Location | Key Rule |
|-------|----------|----------|
| Schema | `features/<f>/schemas/*.schema.ts` | Zod validation. Types from `z.infer`. |
| Action | `features/<f>/actions.ts` | `"use server"`, validates input, calls service, calls `revalidatePath()`. |
| Service | `features/<f>/services/*.service.ts` | Business logic. Throws domain errors. |
| Repository | `features/<f>/db/*.repository.ts` | Prisma/SQL only. Never imports schemas. |

### Server Components (reads)

```
Server Component → Service → Repository → DB → props → Client Component
```

| Layer | Location | Key Rule |
|-------|----------|----------|
| Page | `app/[locale]/(dashboard)/<feature>/page.tsx` | Fetches data at render time. |
| Service | `features/<f>/services/*.service.ts` | Business logic. |
| Repository | `features/<f>/db/*.repository.ts` | Prisma/SQL only. |

### API Routes

```
Client → fetch() → API Route → Service → Repository → DB
```

Use `withRoute()` wrapper for non-streaming routes.

| Layer | Location | Key Rule |
|-------|----------|----------|
| Input schema | Route (`route.ts`) | Parse request body |
| Service | `features/<f>/services/*.service.ts` | Business logic. Throws domain errors. |
| Repository | `features/<f>/db/*.repository.ts` | Prisma/SQL only. |
| Route | `app/api/**/route.ts` | Use `withRoute()`. Returns envelope. |
| Client | `features/<f>/` | `safeParse()` response with contract schema. |

---

## Error Handling

### Domain Errors (lib/errors/)

Service throws domain errors. Route catches via `toHttp()`.

| Error | HTTP Status | Use When |
|-------|-------------|----------|
| `NotFoundError` | 404 | Resource missing or not owned |
| `UnauthorizedError` | 401 | Authentication required |
| `ValidationError` | 400 | Business validation failed |
| `ConflictError` | 409 | Resource conflict (e.g., duplicate) |
| `AppError` | base | Base class for feature-specific errors |

### Feature-Specific Errors

Extend base errors when you need domain-specific errors:

```typescript
// features/passage/errors/passage-errors.ts
export class ArtifactNotFoundError extends NotFoundError {
  constructor(artifactId: string) {
    super("Artifact");
    this.message = `Artifact not found: ${artifactId}`;
  }
}
```

---

## API Response Envelope

### Success

```typescript
{ success: true, data: <result> }
```

### Error (via toHttp)

```typescript
{ success: false, error: "message" }
```

### Schema Factory for Client Validation

```typescript
// features/reading/schemas/translation.schema.ts
import { makeApiResponseSchema } from "@/lib/http/api-envelope-schema";

export const translationDataSchema = z.object({ ... });

export const translateResponseSchema = makeApiResponseSchema(translationDataSchema);
```

---

## Naming Conventions

| Item | Pattern |
|------|---------|
| Files | kebab-case |
| Error class | `<Feature>Error` or extends base |

---

## Schema Conventions

Every validation schema plays **exactly one role**, and the role is encoded by the
**name suffix** so it is obvious at a glance and hard to misfile. This is the guard
against fragmentation ("many hand-written copies") and misfiling ("wrong kind of
schema in the wrong file").

### Roles (suffix = role)

| Role | Name pattern | Direction | Lives in | Example |
|------|--------------|-----------|----------|---------|
| Vocabulary / enum | `<name>Schema` (a `z.enum` or reusable sub-object) | — | feature `schemas/`, or `src/types/` if shared | `uploadSourceTypeSchema`, `questionOptionSchema` |
| Route request body | `<entity>RequestSchema` | client → server (HTTP) | feature `schemas/` or `route.ts` | `translateRequestSchema` |
| Server-action args | `<verb><Entity>InputSchema` | client → server (action) | feature `schemas/`, imported by `actions.ts` | `saveVocabularyInputSchema` |
| Query params | `<entity>QuerySchema` | client → server | feature `schemas/` | `studyChatQuerySchema` |
| Event / queue payload | `<entity>EventSchema` | async | `services/inngest/` or feature | `uploadProcessEventSchema` |
| Data payload (body of a response) | `<entity>DataSchema` + `type <Entity>Dto` | server → client | feature `schemas/` | `translationDataSchema` |
| Response contract | `<entity>ResponseSchema = makeApiResponseSchema(<entity>DataSchema)` | server → client | feature `schemas/` | `translateResponseSchema` |
| Shared output model / DTO | `type <Entity>` / `<Entity>Data` | output | `src/types/<entity>.ts` (used by 2+ features) | `PassageData` |

### Rules

1. **Schema → type, never the reverse.** Derive with `z.infer<typeof schema>`; no hand-written parallel type.
2. **DB is the source of truth for STORED data.** Derive stored enums/shapes from Prisma (`import type { X } from "@/generated/prisma/client"`), never re-type by hand.
3. **Derive, don't redefine.** Build related schemas from a base via `.pick()/.omit()/.extend()/.partial()/.extract()` — e.g. `fileSourceTypeSchema = uploadSourceTypeSchema.extract(["txt", "pdf"])`.
4. **One role per name.** Route request body = `Request`, server-action args = `Input`, output = `Data`/`Dto`/`Response`, allowed values = vocab `Schema`/enum, async payload = `Event`. Never a grab-bag suffix like `Fields` or `Payload`. `Request` and `Input` both mark a client→server input; the suffix records the transport — HTTP route vs server action — so the two never get filed in the wrong layer.
5. **`.strict()` on every object schema** to reject extra fields.
6. **Declare file scope.** A feature `*.schema.ts` holds that feature's vocabulary + request + action input + response only. Server-action input schemas live here (exported) and are imported by `actions.ts` — never declared inline in a `"use server"` file, which can only export async functions and so can never share the schema with a client. Shared output MODELS go to `src/types/`; stored enums come from `@/generated/prisma`. Add a one-line header comment stating the file's scope.

---

## Core Rules

1. **Schema is source of truth.** No parallel hand-written types.
2. **Service owns DTO building.** Prisma changes → compile fails at boundary.
3. **Routes delegate.** One service call; no repository access.
4. **Clients validate.** Always `safeParse`; never casts.
5. **Domain errors are typed.** Service throws specific errors; route catches via `toHttp()`.
6. **Pass logger to services.** Don't create loggers inside services — preserves `requestId`.
7. **Shared models live in `src/types/`; feature-only types stay in the feature.** A model imported by 2+ features (e.g. `PassageData`) belongs in `src/types/`, not inside a feature. Never re-export one feature's internal types from another feature.
8. **`lib/errors/` is HTTP-free.** Domain errors must not import from `lib/http/` or `@sentry/nextjs`.
9. **withRoute for non-streaming.** Use wrapper for clean routes.

---

## Type Safety

- Derive types only from `z.infer<typeof schema>`
- Never use `Omit<PrismaModel, ...>` for DTOs
- Service return types must match DTO types exactly
- Use `safeParse` for runtime validation; never `as` casts
