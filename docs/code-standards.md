# Code Standards

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
│                         CLIENT SIDE                                 │
│  Page ─────────────► Component ─────────────► Hook                 │
│    │                     │                      │                   │
│    ▼                     ▼                     ▼                   │
│  Server Actions (actions.ts) ◄───────────────schemas                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         SERVER SIDE                                 │
│  Route/Action ──────────► Service ──────────► Repository ───► DB   │
│       │                      │                    │                 │
│       ▼                      ▼                    ▼                │
│  schemas/                DTOs + to*Dto()    Prisma queries          │
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

### Anti-Patterns

| Anti-Pattern | Why Wrong | Correct |
|--------------|-----------|---------|
| `Client → Service` | Breaks isolation, `server-only` throws at runtime | Call Action instead |
| `Action → Repository` | Duplicates business logic, bypasses authorization | Call Service instead |
| `Feature → Feature Repository` | Ownership logic lives in wrong feature | Use service method with ownership check |
| `Circular dependency` | A → B → A breaks build and testing | Unidirectional only |
| `Deep import bypassing barrel` | Exposes internal implementation | Use feature barrel file |

### Invariant

Action/Route is **thin** — one service call, nothing else. Service is the only layer that builds DTOs, checks ownership, or throws domain errors.


## Naming Convention

Three distinct concepts, three distinct suffixes:

| Direction | Type | Suffix | How to create |
|-----------|------|--------|---------------|
| Client → Server | Input | `*InputSchema` | Zod `z.object({}).strict()` |
| Client → Server | URL Params | `*QuerySchema` | Zod `z.object({}).strict()` with `z.coerce` |
| Server → Client | Output | `*Dto` | TypeScript `interface` + `to*Dto()` mapper |
| Internal | Database model | `*Model` | TypeScript type from Prisma row |


## Schema Suffix Reference

| Suffix | Purpose | 
|--------|---------|
| `*InputSchema` | Body of Server Action or HTTP POST/PUT | 
| `*QuerySchema` | URL query params | 
| `*Dto` | Response shape returned to client | 
| `*Model` | Prisma/internal row type |


## Type vs Schema vs Enum

| Kind | Runtime validated? | When |
|------|-------------------|------|
| **InputSchema** | Yes | Untrusted input: client → server |
| **QuerySchema** | Yes | URL params / query string |
| **Dto** | No | Server → client, already trusted |
| **Model** | No | Internal Prisma representation |
| **Enum** | From Prisma | Stored values. Never hardcode. |
