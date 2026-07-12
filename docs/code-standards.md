# Code Standards

For source layout and features, see `codebase-summary.md`.
For observability, see `Architecture/observability.md`.

There are **three ways data moves between client and DB**. Each is assembled from the
same **layers** (defined once below) wired in a fixed order. To build a feature: pick the
path that matches the interaction, then fill each layer by its rule. Cross-cutting
concerns — schemas, errors, the response envelope — are each defined in exactly one place
and linked from the paths; do not restate them inline.

---

## Layers

Every path is composed from these. A layer's responsibility is defined **here only** — the
paths below just reference it.

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Schema** | `features/<f>/schemas/*.schema.ts` | Zod validation + `z.infer` types. Single source of truth → [Schemas](#schemas). |
| **Action** | `features/<f>/actions.ts` | `"use server"`. Validate args with an `InputSchema`, call **one** service, `revalidatePath()`, return `{ success, data }`. |
| **Route** | `app/api/**/route.ts` | Parse body with a `RequestSchema`, call **one** service, return the [envelope](#response-envelope). Wrap non-streaming routes in `withRoute()`. |
| **Page** | `app/[locale]/(dashboard)/<f>/page.tsx` | Server Component. Call a service at render time, pass DTOs as props to client components. |
| **Service** | `features/<f>/services/*.service.ts` | Business logic. **Owns DTO building** (Prisma row → `Dto`; return type must equal the `Dto`). Throws typed [domain errors](#errors). Receives the request logger as an arg — never creates its own (preserves `requestId`). |
| **Repository** | `features/<f>/db/*.repository.ts` | Prisma/SQL only. Never imports schemas. |

**Invariant for all paths:** the Action/Route is **thin** — one service call, no repository
access, no business logic. The Service is the only layer that builds DTOs or throws domain
errors.

---

## The three paths

### 1. Server Action — mutations (form submit, button click)

```
Client (useActionState) → Action → Service → Repository → DB
                                 ↘ revalidatePath()
```

- Args validated by a `<verb><Entity>InputSchema`.
- Errors **throw straight to the client's `try/catch`** — actions do not use the envelope.

### 2. API Route — client `fetch()` (needs real HTTP, an external caller, or streaming)

```
Client fetch() → withRoute(Route) → Service → Repository → DB
                          ↘ throw → toHttp() → { success: false, error }
```

- Body validated by an `<entity>RequestSchema`.
- Returns the [response envelope](#response-envelope); the client re-validates it with the
  matching `ResponseSchema` via `safeParse` (never an `as` cast).
- Streaming routes (e.g. AI chat) skip `withRoute()` and stream directly.

### 3. Server Component — reads (initial page render)

```
Page (Server Component) → Service → Repository → DB → DTO props → Client Component
```

- No schema at the boundary (server → server): the service returns typed DTOs directly.

---

## Schemas

Every schema plays **exactly one role**, and the role is encoded by the **name suffix** so
it is obvious at a glance and hard to misfile. This is the guard against fragmentation
(hand-written duplicates) and misfiling (wrong kind of schema in the wrong file).

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

`Request` vs `Input` both mark a client→server input; the suffix records the **transport**
(HTTP route vs server action) so the two never get filed in the wrong layer.

### Rules

1. **Schema → type, never the reverse.** Derive with `z.infer<typeof schema>`. No
   hand-written parallel type; no `Omit<PrismaModel, ...>` for DTOs.
2. **DB is the source of truth for STORED data.** Derive stored enums/shapes from Prisma
   (`import type { X } from "@/generated/prisma/client"`), never re-type by hand.
3. **Derive, don't redefine.** Build related schemas from a base via
   `.pick()/.omit()/.extend()/.partial()/.extract()` — e.g.
   `fileSourceTypeSchema = uploadSourceTypeSchema.extract(["txt", "pdf"])`.
4. **One role per name** (see table). Never a grab-bag suffix like `Fields` or `Payload`.
5. **`.strict()` on every object schema** to reject extra fields.
6. **Clients validate responses with `safeParse`** — never `as` casts.
7. **File scope.** A feature `*.schema.ts` holds that feature's vocabulary + request +
   action input + response only. Server-action input schemas live here (exported) and are
   imported by `actions.ts` — never inline in a `"use server"` file, which can only export
   async functions and so can never share the schema with a client. Shared output MODELS go
   to `src/types/`; stored enums come from `@/generated/prisma`. Add a one-line header
   comment stating the file's scope.

### Response envelope

Routes return a uniform envelope; the client validates it with the role-matched
`ResponseSchema`.

```typescript
// success
{ success: true, data: <result> }
// error (produced by toHttp)
{ success: false, error: "message" }
```

Build the contract with the factory instead of hand-writing the envelope:

```typescript
// features/reading/schemas/translation.schema.ts
import { makeApiResponseSchema } from "@/lib/http/api-envelope-schema";

export const translationDataSchema = z.object({ /* ... */ });
export const translateResponseSchema = makeApiResponseSchema(translationDataSchema);
```

---

## Errors

The Service throws typed **domain errors**; the Route boundary maps them to HTTP via
`toHttp()`. Actions let them throw straight to the client.

| Error | HTTP Status | Use When |
|-------|-------------|----------|
| `NotFoundError` | 404 | Resource missing or not owned |
| `UnauthorizedError` | 401 | Authentication required |
| `ValidationError` | 400 | Business validation failed |
| `ConflictError` | 409 | Resource conflict (e.g., duplicate) |
| `AppError` | base | Base class for feature-specific errors |

Only subclass an error when it earns its place — it adds a **specific message** (like
`ArtifactNotFoundError` below) or a **field the caller consumes** (like a
`PassageStudyServiceError.code`). A subclass or re-export that merely renames a base error,
without adding either, is redundant — throw or import the base directly. A wrapper over
plain `Error` (instead of an `AppError` subclass) also misses `toHttp`'s mapping and falls
through to 500; use a domain error so it maps to the right status.

```typescript
// features/passage/errors/passage-errors.ts
export class ArtifactNotFoundError extends NotFoundError {
  constructor(artifactId: string) {
    super("Artifact");
    this.message = `Artifact not found: ${artifactId}`;
  }
}
```

**`lib/errors/` is HTTP-free** — domain errors must not import from `lib/http/` or
`@sentry/nextjs`. The mapping to HTTP happens only at the route boundary (`toHttp()`).

---

## File & symbol naming

| Item | Pattern |
|------|---------|
| Files | kebab-case |
| Error class | `<Feature>Error`, or extends a base error |
| Schemas | by role — see [Schemas](#schemas) |
