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
| Service | `features/<f>/services/*-service.ts` | Business logic. Throws domain errors. |
| Repository | `features/<f>/db/*-repository.ts` | Prisma/SQL only. Never imports schemas. |

### Server Components (reads)

```
Server Component → Service → Repository → DB → props → Client Component
```

| Layer | Location | Key Rule |
|-------|----------|----------|
| Page | `app/[locale]/(dashboard)/<feature>/page.tsx` | Fetches data at render time. |
| Service | `features/<f>/services/*-service.ts` | Business logic. |
| Repository | `features/<f>/db/*-repository.ts` | Prisma/SQL only. |

### API Routes

```
Client → fetch() → API Route → Service → Repository → DB
```

Use `withRoute()` wrapper for non-streaming routes.

| Layer | Location | Key Rule |
|-------|----------|----------|
| Input schema | Route (`route.ts`) | Parse request body |
| Service | `features/<f>/services/*-service.ts` | Business logic. Throws domain errors. |
| Repository | `features/<f>/db/*-repository.ts` | Prisma/SQL only. |
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
| Data schema | `<name>Schema` + `type <Name>Dto = z.infer<...>` |
| Input schema | `<entity>RequestSchema` |
| Response contract | `<entity>ResponseSchema = makeApiResponseSchema(<entity>Schema)` |
| Error class | `<Feature>Error` hoặc extends base |

All schemas use `.strict()` to catch extra fields.

---

## Core Rules

1. **Schema is source of truth.** No parallel hand-written types.
2. **Service owns DTO building.** Prisma changes → compile fails at boundary.
3. **Routes delegate.** One service call; no repository access.
4. **Clients validate.** Always `safeParse`; never casts.
5. **Domain errors are typed.** Service throws specific errors; route catches via `toHttp()`.
6. **Pass logger to services.** Don't create loggers inside services — preserves `requestId`.
7. **No cross-feature re-exports.** Types stay in their owning feature.
8. **`lib/errors/` is HTTP-free.** Domain errors must not import from `lib/http/` or `@sentry/nextjs`.
9. **withRoute for non-streaming.** Use wrapper for clean routes.

---

## Type Safety

- Derive types only from `z.infer<typeof schema>`
- Never use `Omit<PrismaModel, ...>` for DTOs
- Service return types must match DTO types exactly
- Use `safeParse` for runtime validation; never `as` casts
