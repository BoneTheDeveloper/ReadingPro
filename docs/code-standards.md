# Code Standards

## Request/Response Data Flow

All API data flows follow a strict layering pattern to maintain clean separation of concerns and prevent wire-contract drift from database schema changes.

### Architecture Diagram

```
Frontend                    API route (app/api/**)       Service (server/modules/<feature>/*.service.ts)   Repository (*.repository.ts)   DB
   │                            │                                  │                                          │              │
   │─POST body (JSON)──────────>│                                  │                                          │              │
   │                            │ zod.parse(request schema)        │                                          │              │
   │                            │──validated input────────────────>│                                          │              │
   │                            │                                  │──calls repository──────────────────────>│─Prisma/SQL──>│
   │                            │                                  │<─Prisma model / raw rows─────────────────│<─────────────│
   │                            │                                  │──maps to DTO via to<X>Dto()/build<X>Dto()│                │
   │                            │<──DTO (matches contracts type)───│                                          │              │
   │<──{success, data: DTO}─────│  wrap in envelope (api-response-schema.ts)                                                 │
   │  .safeParse(response schema) or `as Type` (weaker, discouraged)                                                         │
   │  render DTO                │                                                                                            │
```

### Layer Responsibilities

| Layer | Location | Responsibility | Example |
|-------|----------|-----------------|---------|
| **Contracts (Schemas)** | `contracts/<feature>/*-response-schema.ts` | Zod schemas defining wire shape; types are `z.infer<...>`. This is the single source of truth for what the frontend receives. Must use `.strict()` | `contracts/dictionary/dictionary-response-schema.ts` |
| **Contracts (DTOs)** | `contracts/<feature>/*-dtos.ts` | Re-exports inferred DTO types; small pure helpers (e.g. `getSourceLabel`). Never hand-write type definitions here. | `contracts/dictionary/dictionary-dtos.ts` |
| **HTTP Envelope** | `contracts/http/api-response-schema.ts` | Shared builders: `makeSuccessEnvelopeSchema`, `makeResponseSchema`, `apiErrorResponseSchema`. Every feature wraps its data schema with these. | Imported by feature response schemas |
| **Repository** | `server/modules/<feature>/*/*.repository.ts` | ONLY Prisma/SQL access. Returns Prisma models or raw SQL row objects. Never imports from `contracts/`. | `server/modules/dictionary/lookup/lookup.repository.ts` |
| **Service** | `server/modules/<feature>/*/*.service.ts` | Business logic. **Calls repository AND converts output into DTO type from `contracts/`** before returning. This is the mandatory boundary—if Prisma schema changes, the DTO return type annotation fails to compile. | `server/modules/dictionary/lookup/lookup.service.ts` |
| **DTO Builders** | `server/modules/<feature>/shared/*-dto-builders.ts` | Optional shared mapper functions. Mapper signatures take minimal shape (only fields they read) and declare explicit DTO return types. Prevents silent drift from Prisma model changes. | `server/modules/dictionary/shared/dictionary-dto-builders.ts` |
| **API Route** | `app/api/**/route.ts` | Parses request body/query with zod request schema; calls exactly one service function; wraps returned DTO in envelope; translates errors to HTTP status codes. Never calls repository directly or constructs/shapes response data. | `app/api/dictionary/lookup/route.ts` |
| **Frontend Client** | `features/<feature>/*-client.ts` | Fetch wrapper. Imports response types from `contracts/`. Should validate with `.safeParse(responseSchema)` rather than blind `as Type` casts. | `features/dictionary/dictionary-client.ts` |

### Key Boundaries

#### Response Schema → Type Definition Flow

1. **`contracts/<feature>/*-response-schema.ts`** defines zod schema (`.strict()`).
2. **`contracts/<feature>/*-dtos.ts`** exports type as `type XDto = z.infer<typeof xSchema>`.
3. **Service layer** imports DTO type and ensures return type annotations match: `async function doX(): Promise<XDto>`.
4. **Route layer** imports response schema and wraps DTO: `return NextResponse.json({ success: true, data: serviceResult })`.

No hand-written parallel type definitions. The schema is the source of truth.

#### DTO Mapping Pattern

Mapper function signatures must declare minimal input shapes and explicit DTO return types:

```typescript
// Good: explicit, prevents silent coupling to Prisma schema
function buildEntryDto(
  entry: EntryWithSenses,  // shape defines only what mapper reads
  targetLanguage: string,
  statuses: readonly string[],
): DictionaryEntryDto {  // explicit return type
  // ...
  return { id, headword, senses, ... } as const satisfies DictionaryEntryDto;
}

// Bad: derives from Prisma type; new columns leak unreviewed
function toEntryDto(entry: Omit<PrismaEntry, 'internalId'>): typeof entry {
  // ...
}
```

#### Service Owns DTO Building

The service layer is the single point where repository output is converted to the wire contract:

```typescript
// Service layer
export async function resolveLookup(term: string): Promise<DictionaryEntryDto> {
  const rows = await findDictionaryLookupEntry(term);  // from repository
  const entry = groupRows(rows);
  return buildEntryDto(entry, targetLanguage, statuses);  // ← DTO built here
}

// API route
export async function GET(request: NextRequest) {
  const dto = await resolveLookup(term);  // service returns DTO
  return NextResponse.json({ success: true, data: dto });  // route wraps it
}
```

#### API Route Never Calls Repository Directly

Routes must delegate all business logic to services. Calling the repository directly:
- Violates layer separation
- Bypasses DTO mapping (response may diverge from contract)
- Makes schema changes harder to track

```typescript
// Bad: route calls repository directly
const rows = await listVocabularyItems({ userId });
return NextResponse.json({ success: true, data: { items: rows } });

// Good: route calls service, service owns repository + DTO mapping
const result = await getVocabularyList({ userId });
return NextResponse.json({ success: true, data: result });
```

## File Naming Conventions

- **Kebab-case** for all file names (`user-service.ts`, `auth-utils.ts`, not `userService.ts`).
- **Descriptive names** — LLM tools (Grep, Glob) should understand file purpose from name alone.
- **File size limit:** Individual files should stay under 200 lines. Consider modularizing beyond that.

---

## Directory Structure

```
src/
├── app/                    # Next.js routes and API endpoints
│   ├── api/**/route.ts     # HTTP handlers (parse request, call service, wrap response)
│   └── ...
├── server/
│   ├── modules/            # Feature-specific backend logic
│   │   ├── <feature>/
│   │   │   ├── <sub-feature>/
│   │   │   │   ├── *.repository.ts   # DB access only
│   │   │   │   └── *.service.ts      # Business logic + DTO mapping
│   │   │   └── shared/
│   │   │       └── *-dto-builders.ts # Shared mappers
│   │   └── ...
│   ├── auth/               # Authentication utilities
│   ├── db/                 # Legacy direct Prisma queries (being migrated to modules/)
│   ├── http/               # HTTP error handling
│   └── ...
├── contracts/              # Zod schemas and inferred DTO types
│   ├── <feature>/
│   │   ├── *-response-schema.ts  # Zod schema (`.strict()`)
│   │   ├── *-request-schema.ts   # Optional request zod schema
│   │   └── *-dtos.ts             # Inferred types + helpers
│   ├── http/               # Shared envelope builders
│   └── ...
├── features/               # Frontend feature modules
│   ├── <feature>/
│   │   ├── *-client.ts     # Fetch wrapper (import + validate response from contracts/)
│   │   ├── hooks/
│   │   ├── model/          # Should NOT duplicate types; re-export from contracts/
│   │   └── ...
│   └── ...
├── components/             # Shared React components
│── lib/                    # Shared utilities
└── i18n/                   # Internationalization
```

---

## Error Handling

API routes should:
1. Parse request with zod; return 400 if invalid.
2. Call service; if service throws custom error, translate to appropriate status code.
3. Wrap all other exceptions in 500 and log to Sentry.

```typescript
try {
  const input = requestSchema.parse(body);
  const result = await serviceFunction(input);
  return NextResponse.json({ success: true, data: result });
} catch (error) {
  if (error instanceof CustomServiceError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  Sentry.captureException(error);
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}
```

---

## Type Safety

- All DTO types must be inferred from zod schemas via `z.infer<typeof schema>`.
- Never use `Omit<PrismaModel, ...>` to derive DTO types.
- Service return type annotations must explicitly match the DTO type:
  ```typescript
  async function doX(input: Input): Promise<DictionaryEntryDto> {
    // Compiler fails if return doesn't match DictionaryEntryDto
  }
  ```
