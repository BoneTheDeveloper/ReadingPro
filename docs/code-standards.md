# Code Standards

For source layout and features, see `codebase-summary.md`.
For observability, see `Architecture/observability.md`.
Import boundaries are **enforced by ESLint** (`eslint-plugin-boundaries`) — see
`eslint.config.mjs`. This doc explains *why* the layers exist; the config is the
source of truth for *what* can import *what*. Do not restate the rules here.

---

## Layers

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Schema** | `features/<f>/schemas/*.schema.ts` | Zod validation + `z.infer` types → [Schemas](#schemas). |
| **Action** | `features/<f>/actions.ts` | `"use server"`. Validate args with an `InputSchema`, call **one** service, `revalidatePath()`. |
| **Route** | `app/api/**/route.ts` | Parse body with a `RequestSchema`, call **one** service, return the [envelope](#response-envelope). Wrap in `withRoute()`. |
| **Page** | `app/[locale]/**/page.tsx` | Server Component. Call a service, pass DTOs as props. |
| **Service** | `features/<f>/services/*.service.ts` | Business logic. **Owns DTO building** (Prisma row → `Dto`). Owns **authorization**. Throws [domain errors](#errors). |
| **Repository** | `features/<f>/db/*.repository.ts` | Prisma only. No schemas, no auth checks, no business rules. |

**Why these boundaries** (ESLint enforces them; here is the reasoning):

- **Repo never calls Service** — avoids circular deps, and lets Service be tested without a DB.
- **Action/Route never calls Repo** — mapping, authorization, and cascade logic must live in
  exactly one place, or the second caller will duplicate it.
- **Client never touches Service/Repo** — `server-only` throws at runtime; ESLint catches it earlier.
- **Feature never imports Feature** — keeps a slice deletable as a unit. Need to communicate?
  Use an Inngest event, lift the shared piece into `lib/`, or let `app/` compose both.

**Invariant:** Action/Route is **thin** — one service call, nothing else. Service is the only
layer that builds DTOs, checks ownership, or throws domain errors.

---

## The three paths

### 1. Server Action — mutations (form submit, button click)
```
Client (useActionState) → Action → Service → Repository → DB
                                 ↘ revalidatePath()
```

- Args validated by a `<verb><Entity>InputSchema`.
- Errors **throw straight to the client's `try/catch`** — actions do not use the envelope.

### 2. API Route — client `fetch()` (real HTTP, external caller, or streaming)

```
Client fetch() → withRoute(Route) → Service → Repository → DB
                          ↘ throw → toHttp() → { success: false, error }
```
- Body validated by an `<entity>RequestSchema`.
- Returns the [envelope](#response-envelope); the client re-validates with the matching
  `ResponseSchema` via `safeParse` (never an `as` cast).
- Streaming routes (AI chat) skip `withRoute()` and stream directly.

### 3. Server Component — reads (initial page render)


```
Page (Server Component) → Service → Repository → DB → DTO props → Client Component
```

- No schema at the boundary (server → server): the service returns typed DTOs directly.

---

## Schemas

Every schema plays **exactly one role**, encoded by the name suffix.

| Role | Name pattern | Direction | Lives in |
|------|--------------|-----------|----------|
| Vocabulary / enum | `<name>Schema` | — | feature `schemas/` |
| Route request body | `<entity>RequestSchema` | client → server (HTTP) | feature `schemas/` |
| Server-action args | `<verb><Entity>InputSchema` | client → server (action) | feature `schemas/` |
| Query params | `<entity>QuerySchema` | client → server | feature `schemas/` |
| Event / queue payload | `<entity>EventSchema` | async | feature `services/inngest/` |
| Response data | `<entity>DataSchema` + `type <Entity>Dto` | server → client (HTTP) | feature `schemas/` |
| Response contract | `<entity>ResponseSchema = makeApiResponseSchema(<entity>DataSchema)` | server → client | feature `schemas/` |
| Shared type across features | `type <Entity>` | — | `src/types/<entity>.ts` |

`Request` vs `Input` both mark client→server; the suffix records the **transport** (HTTP
route vs server action).

### `src/types/` — when, and only when

A type goes here **only** if two or more features consume it and neither owns it. It must be
a **plain TypeScript type** — no Zod schema, no logic. If you find yourself wanting a schema
there, the feature boundary is wrong: one feature owns the concept, and the other should be
talking to it through an event or an action, not importing its shape.

Stored enums come from `@/generated/prisma/client`, not from here.

### Rules

1. **Schema → type, never the reverse.** `z.infer<typeof schema>`. No hand-written parallel
   type; no `Omit<PrismaModel, ...>` for DTOs.
2. **Prisma is the source of truth for stored data.** Derive stored enums/shapes from
   `@/generated/prisma/client`, never re-type by hand.
3. **Derive, don't redefine.** `.pick()/.omit()/.extend()/.partial()/.extract()` — e.g.
   `fileSourceTypeSchema = uploadSourceTypeSchema.extract(["txt", "pdf"])`.
4. **One role per name.** Never a grab-bag suffix like `Fields` or `Payload`.
5. **`.strict()` on every object schema.**
6. **Clients validate HTTP responses with `safeParse`** — never `as` casts.
7. **Action input schemas live in `schemas/`, exported**, and are imported by `actions.ts` —
   never inline in a `"use server"` file, which can only export async functions and so could
   never share the schema with the client.

### Response envelope

```typescript
{ success: true, data: <result> }              // success
{ success: false, error: "message" }           // error, produced by toHttp
```

Build the contract with the factory, never by hand:

```typescript
import { makeApiResponseSchema } from "@/lib/http/api-envelope-schema";

export const translationDataSchema = z.object({ /* ... */ }).strict();
export const translateResponseSchema = makeApiResponseSchema(translationDataSchema);
```

---

## Errors

The **Service** throws typed domain errors. The **Route** boundary maps them to HTTP via
`toHttp()`. **Actions** let them throw straight to the client.

| Error | HTTP Status | Use When |
|-------|-------------|----------|
| `NotFoundError` | 404 | Resource missing or not owned |
| `UnauthorizedError` | 401 | Authentication required |
| `ForbiddenError` | 403 | Authenticated but not permitted |
| `ValidationError` | 400 | Business validation failed |
| `ConflictError` | 409 | Duplicate or state conflict |
| `AppError` | base | Base class for feature-specific errors |

**Only subclass when it earns its place** — it adds a specific message, or a field the caller
consumes. A subclass that merely renames a base error is redundant; throw the base directly.
A wrapper over plain `Error` misses `toHttp`'s mapping and falls through to 500 — always
extend `AppError`.

```typescript
// features/passage/errors/passage-errors.ts
export class ArtifactNotFoundError extends NotFoundError {
  constructor(artifactId: string) {
    super("Artifact");
    this.message = `Artifact not found: ${artifactId}`;
  }
}
```

**`lib/errors/` is HTTP-free** — domain errors must not import `lib/http/` or `@sentry/nextjs`.
Mapping to HTTP happens only at the route boundary.

**Operational errors log at `warn` and never create a Sentry Issue.** Sentry Issues are
created only at `toHttp()` and `withAction()` boundaries.

---

## Type vs Schema vs Enum

| Kind | Runtime validated? | When |
|------|-------------------|------|
| **Schema** (`const ...Schema` + `.parse()`) | Yes | Untrusted input: client → server (action args, route body, query params, event payload) |
| **Response DTO** (`...DataSchema` + `type ...Dto`) | Yes, by the client | Server → client over HTTP. Client `safeParse`s the envelope. |
| **Props DTO** (`type ...Dto` only) | No | Server Component → Client Component. Already typed; no boundary to cross. |
| **Enum** | From Prisma | Stored values. Never hardcoded. |

```typescript
// Untrusted input — validate
export const saveVocabularyInputSchema = z.object({
  itemId: z.uuid(),
}).strict();
export type SaveVocabularyInput = z.infer<typeof saveVocabularyInputSchema>;

// Enum — Prisma is the source of truth (Zod 4: z.enum, not z.nativeEnum)
import { VocabularyStatus } from "@/generated/prisma/client";
export const vocabularyStatusSchema = z.enum(VocabularyStatus);

// Props DTO — server → server, no schema needed
export type VocabularyItemDto = {
  id: string;
  status: VocabularyStatus;
  word: string;
};
```

### Import rules

```typescript
// Prisma enum in client code → import type (prevents Prisma bundle leakage)
import type { VocabularyStatus } from "@/generated/prisma/client";

// DTO in client code → import type
import type { VocabularyItemDto } from "@/features/vocabulary/schemas";

// Server-only → regular import (and the file must have `import "server-only"`)
import { prisma } from "@/lib/prisma";
```

---

## File & symbol naming

| Item | Pattern |
|------|---------|
| Files | kebab-case |
| Folders inside a slice | no feature-name prefix (`db/repo.ts`, not `db/passage.repository.ts` — the folder already says it) |
| Error class | extends `AppError` or a base error |
| Schemas | by role — see [Schemas](#schemas) |
