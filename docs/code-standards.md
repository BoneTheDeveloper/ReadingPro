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
| **Schema** | `features/<f>/schemas/*.ts` | Zod validation only — Input schemas. |
| **Action** | `features/<f>/server/actions/*.ts` | `"use server"`. Validate with InputSchema, call one service, `revalidatePath()`. |
| **Route** | `app/api/**/route.ts` | Parse request with QuerySchema/InputSchema, call one service, return `Response.json()`. |
| **Page** | `app/[locale]/**/page.tsx` | Server Component. Call a service, pass DTOs as props. |
| **Service** | `features/<f>/server/services/*.ts` | Business logic. **Owns DTO building** (`toEntityDto`). Owns authorization. Throws domain errors. |
| **Repository** | `features/<f>/server/db/*.ts` | Prisma only. No schemas, no auth checks, no business rules. |

### Import Boundaries

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT SIDE                                  │
│  Page ─────────────► Component ─────────────► Hook                  │
│    │                      │                      │                   │
│    ▼                      ▼                      ▼                 │
│  Server Actions (actions.ts) ◄── can import schemas/               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         SERVER SIDE                                  │
│  Route/Action ──────────► Service ──────────► Repository ───► DB   │
│       │                      │                    │                │
│       ▼                      ▼                    ▼                │
│  schemas/ (InputSchema)  DTOs + to*Dto()    Prisma queries         │
└─────────────────────────────────────────────────────────────────────┘
```

**Allowed imports:**

| From | Can import |
|------|------------|
| **Client** (Page, Component, Hook) | Action, schemas (InputSchema type), DTO types |
| **Action** | schemas (InputSchema), services, DTOs |
| **Route** | schemas (InputSchema/QuerySchema), services |
| **Service** | services of other features (with caution), repositories |
| **Repository** | Nothing server-side except Prisma + lib utilities |

**Cross-feature imports:** Allowed for types/DTOs, discouraged for services (creates tight coupling).

### Cross-Feature Import Rules

**Unidirectional dependency:** If Feature A depends on Feature B, Feature B MUST NOT depend on Feature A.

```
✅ Valid: Reading → Dictionary (Reading can use Dictionary)
❌ Invalid: Dictionary → Reading (circular dependency)
```

**Barrel file pattern:** Each feature exports only allowed APIs via `index.ts`:

```typescript
// ✅ Correct: Import via barrel file
import { lookupWord, type WordLookupResult } from '@/features/dictionary';

// ❌ Wrong: Deep import bypassing barrel
import { findWordByHeadword } from '@/features/dictionary/server/db/lookup';
```

**Ownership checks:** Features MUST NOT import other feature's repositories directly. Use service methods:

```typescript
// ❌ Wrong: Cross-feature repo import
import { findOwnedPassage } from "@/features/passage/server/db/passage";

// ✅ Correct: Use service method
import { verifyPassageOwnership } from "@/features/passage/server/services";
```

**UI Communication between features:**

| Pattern | When to use | Example |
|---------|-------------|---------|
| **URL-driven** (best) | Features on same/different pages | `?word=apple` triggers Dictionary lookup |
| **Page composition** | Features on same page | `page.tsx` passes props between `ReadingViewer` and `DictionarySidebar` |
| **Global state** | Features far apart on page | `useReadingStore` with Zustand/Context |

### Anti-Patterns

| Anti-Pattern | Why Wrong | Correct |
|--------------|-----------|---------|
| `Client → Service` | Breaks isolation, `server-only` throws at runtime | Call Action instead |
| `Action → Repository` | Duplicates business logic, bypasses authorization | Call Service instead |
| `Feature → Feature Repository` | Ownership logic lives in wrong feature | Use service method with ownership check |
| `Circular dependency` | A → B → A breaks build and testing | Unidirectional only |
| `Deep import bypassing barrel` | Exposes internal implementation | Use feature barrel file |
| `DTO schema` (Zod for output) | DTOs are trusted server output, no validation needed | Use TypeScript `interface *Dto` |
| `Response envelope` for internal APIs | Unnecessary complexity | Return data directly |
| Inline business logic in Action/Route | Breaks single-responsibility | Move to Service |

### Why These Boundaries

- **Repo never calls Service** — avoids circular deps, and lets Service be tested without a DB.
- **Action/Route never calls Repo** — mapping, authorization, and cascade logic must live in exactly one place, or the second caller will duplicate it.
- **Client never touches Service/Repo** — `server-only` throws at runtime; ESLint catches it earlier.
- **Feature never imports Feature** — keeps a slice deletable as a unit.

### Invariant

Action/Route is **thin** — one service call, nothing else. Service is the only layer that builds DTOs, checks ownership, or throws domain errors.

---


## Data Flow

```
Client ──(Zod InputSchema)──► Action/Route ──► Service ──► Repository ──► DB
                                    │                           │
                                    │                    EntityModel
                                    │                           │
                                    └───── Response.json() ◄── toEntityDto()
```

---

## File Organization by Scope

### Level 1: Feature-shared schemas → `features/<f>/schemas/*.ts`

If a schema is used by multiple places within the same feature (client + server), put it in the `schemas/` folder.

```
features/vocabulary/
├── VocabularyForm.tsx      # imports from schemas/
├── actions.ts              # imports from schemas/
└── schemas/
    └── vocabulary.ts      # ALL schemas for vocabulary feature
```

### Level 2: Single-use schemas → inline in Action/Route

If a schema is used by exactly one Server Action or API Route, keep it inline or in a file co-located with that action/route.

```typescript
// features/vocabulary/actions.ts

// Inline schema — only this action uses it
const updateStatusInputSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["LEARNED", "NEW"]),
}).strict();

export async function updateVocabularyStatus(data: unknown) {
  const parsed = updateStatusInputSchema.parse(data);
  // ...
}
```

**Why:** Prevents `schemas/` folder from becoming a dumping ground for micro-schemas.

### Cross-feature → `src/types/`

Types used by 2+ features where neither owns the concept go in `src/types/`. Schemas go in the feature that owns the concept.

---

## Naming Convention

Three distinct concepts, three distinct suffixes:

| Direction | Type | Suffix | How to create |
|-----------|------|--------|---------------|
| Client → Server | Input | `*InputSchema` | Zod `z.object({}).strict()` |
| Client → Server | URL Params | `*QuerySchema` | Zod `z.object({}).strict()` with `z.coerce` |
| Server → Client | Output | `*Dto` | TypeScript `interface` + `to*Dto()` mapper |
| Internal | Database model | `*Model` | TypeScript type from Prisma row |

### Example

```typescript
// =============================================================================
// INPUT — client sends this
// =============================================================================
export const createVocabularyInputSchema = z.object({
  word: z.string().min(1),
  translation: z.string().min(1),
}).strict();

export type CreateVocabularyInput = z.infer<typeof createVocabularyInputSchema>;

// =============================================================================
// OUTPUT — server returns this
// =============================================================================
// Plain TypeScript interface
export interface VocabularyItemDto {
  id: string;
  word: string;
  translation: string;
  status: VocabularyStatus;
  createdAt: string; // JSON format
}

// Mapper: EntityModel (Prisma) → Dto
export function toVocabularyItemDto(row: VocabularyItemModel): VocabularyItemDto {
  return {
    id: row.id,
    word: row.normalizedText,
    translation: row.translation,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

// =============================================================================
// INTERNAL — Prisma model type
// =============================================================================
export type VocabularyItemModel = {
  id: string;
  normalizedText: string;
  translation: string;
  status: VocabularyStatus;
  createdAt: Date; // Prisma Date, not JSON
};
```

---

## Zod Best Practices

### 1. Always `.strict()` on Input schemas

.strict() rejects requests with extra fields (e.g., hacker sends `isAdmin: true`).

```typescript
// ✅ CORRECT — rejects unknown fields
export const createVocabularyInputSchema = z.object({
  word: z.string().min(1),
}).strict();

// ❌ WRONG — silently strips unknown fields
export const createVocabularyInputSchema = z.object({
  word: z.string().min(1),
});
// .strip() is default — unknown fields are silently removed
```

### 2. Use `z.coerce` for URL params / FormData

URL params and FormData are always strings. Use `z.coerce` to parse them.

```typescript
// URL: /api/items?page=2&isActive=true
export const getItemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  isActive: z.coerce.boolean().optional(),
}).strict();
```

### 3. Use Base Schema for Create/Update reuse

Use `.omit()` and `.pick()` to avoid duplicating field definitions.

```typescript
// 1. Base schema with all fields
const baseEntitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]),
}).strict();

// 2. Create — omit id (auto-generated)
export const createEntityInputSchema = baseEntitySchema.omit({ id: true });

// 3. Update — all fields optional
export const updateEntityInputSchema = baseEntitySchema.partial().strict();
```

### 4. Detailed error messages

```typescript
export const createVocabularyInputSchema = z.object({
  word: z.string().min(1, "Word is required"),
  translation: z.string().min(1, "Translation is required"),
}).strict();
```

---

## Schema Suffix Reference

| Suffix | Purpose | Location |
|--------|---------|----------|
| `*InputSchema` | Body of Server Action or HTTP POST/PUT | `features/<f>/schemas/` |
| `*QuerySchema` | URL query params | `features/<f>/schemas/` |
| `*EventSchema` | Inngest queue payload | `features/<f>/server/inngest/` |
| `*Dto` | Response shape returned to client | `features/<f>/server/services/` |
| `*Model` | Prisma/internal row type | `features/<f>/server/services/` or `types/` |

**Never create a schema for DTO output.** DTOs are plain TypeScript interfaces + mapper functions.

---

## Response Patterns

### Server Action (recommended for mutations)

```typescript
// Action — throws errors naturally, no envelope
export async function createVocabularyAction(input: CreateVocabularyInput) {
  const item = await createVocabulary(input);
  revalidatePath("/vocabulary");
  return toVocabularyItemDto(item);
}
```

### API Route (external access, webhooks, streaming)

```typescript
// Route — direct Response.json(), no envelope
export async function POST(req: Request) {
  try {
    const result = await executeAction(await req.json());
    return Response.json(result);
  } catch {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
```

### When to validate third-party responses

Only validate responses from **external APIs** (GitHub, Stripe, weather APIs). You control your own responses.

```typescript
// Validate external API response with Zod
const githubRepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
});

const response = await fetch("https://api.github.com/repos/...");
const data = githubRepoSchema.parse(await response.json());
```

---

## Type vs Schema vs Enum

| Kind | Runtime validated? | When |
|------|-------------------|------|
| **InputSchema** | Yes | Untrusted input: client → server |
| **QuerySchema** | Yes | URL params / query string |
| **EventSchema** | Yes | Async queue payloads |
| **Dto** | No | Server → client, already trusted |
| **Model** | No | Internal Prisma representation |
| **Enum** | From Prisma | Stored values. Never hardcode. |

---

## Errors

Service throws typed domain errors. Action/Route catches and converts to HTTP response.

| Error | HTTP Status | Use When |
|-------|-------------|---------|
| `NotFoundError` | 404 | Resource missing or not owned |
| `UnauthorizedError` | 401 | Authentication required |
| `ForbiddenError` | 403 | Authenticated but not permitted |
| `ValidationError` | 400 | Business validation failed |
| `ConflictError` | 409 | Duplicate or state conflict |
| `AppError` | base | Base class for feature-specific errors |

```typescript
// features/passage/server/errors/passage-errors.ts
export class ArtifactNotFoundError extends NotFoundError {
  constructor(artifactId: string) {
    super("Artifact");
    this.message = `Artifact not found: ${artifactId}`;
  }
}
```

---

## Import Rules

```typescript
// Prisma enum → import type in client code
import type { VocabularyStatus } from "@/generated/prisma/client";

// Dto → import type
import type { VocabularyItemDto } from "@/features/vocabulary/server/services";

// InputSchema → import type (for client calling action)
import type { CreateVocabularyInput } from "@/features/vocabulary/schemas";

// Server-only (Prisma, services) → regular import, file must have `import "server-only"`
import { prisma } from "@/lib/prisma";
```

---

## File & symbol naming

| Item | Pattern |
|------|---------|
| Files | kebab-case |
| Schemas | `*InputSchema`, `*QuerySchema`, `*EventSchema` |
| DTOs | `*Dto` + `to*Dto()` function |
| Models | `*Model` |
| Error class | extends `AppError` or a base error |
| Folders | no feature-name prefix (`db/repo.ts` not `db/vocabulary-repo.ts`) |
