# Codebase Summary

English Reading Training App — Full-stack Next.js application for language learning with vocabulary tracking, dictionary lookup, passage analysis, and AI-assisted translation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript 6, Tailwind CSS v4, shadcn/ui (Base UI + Radix) |
| **Framework** | Next.js 16 (App Router, Turbopack, Server Actions) |
| **Runtime** | Node.js 24, pnpm |
| **Backend** | Next.js Server Actions + API routes |
| **Database** | PostgreSQL (`pg`), Prisma ORM 7 |
| **Auth** | Clerk |
| **Validation** | Zod 4 |
| **AI** | Vercel AI SDK v6 (`@ai-sdk/google` Gemini, `@ai-sdk/openai`) |
| **Storage** | Vercel Blob |
| **Observability** | Sentry, Pino logger |
| **i18n** | next-intl |
| **Testing** | Vitest 4, Testing Library |

## Source Layout

The app uses a **vertical-slice** structure: each `src/features/<feature>/` owns its full
stack (DB access, services, schemas, hooks, UI). There is no shared top-level `server/` or
`contracts/` layer — those concerns live inside each feature slice.

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # HTTP route handlers (route.ts per endpoint)
│   │   └── <domain>/         # e.g. dictionary/, translate/, studio/, upload/
│   └── [locale]/             # Localized UI routes
│       ├── (auth)/           # sign-in, sign-up
│       └── (dashboard)/      # dictionary, study, upload, vocabulary, progress, processing
│
├── features/                 # Vertical feature slices (see pattern below)
│   └── <feature>/            
│       ├── actions.ts        # Server Actions for mutations ("use server")
│       ├── db/               # Repositories: raw Prisma access
│       ├── services/         # Business logic + DTO builders
│       ├── schemas/          # Zod schemas + inferred types
│       ├── hooks/            # React hooks (mutations via useActionState)
│       ├── ui/              # React components
│       └── *-client.ts      # Client API wrapper (reads + mutations)
│
├── components/               # Shared React components (cross-feature)
│   ├── ui/                   # Shadcn/ui primitives 
│   ├── layout/               # dashboard-sidebar, auth-controls, ...
│   ├── provider/             # theme-provider
│   └── system/               # error-boundary
│
├── services/                 # Cross-cutting integrations (not feature-specific)
│   ├── ai/                   # Gemini helpers: model-config, question-generator, ...
│   ├── clerk.ts              # Auth (Clerk)
│   ├── storage.ts            # Blob storage
│   └── logger.ts             # Request logging
│
├── lib/                      # Shared low-level utilities
│   ├── http/                 # api-request, api-response.schema, route-errors
│   ├── prisma.ts             # Prisma client singleton
│   └── utils.ts
│
├── types/                    # Shared domain types (e.g. cefr.ts)
├── i18n/                     # next-intl config + messages/
├── generated/prisma/         # Prisma client (auto-generated, do not edit)
│
├── instrumentation.ts        # Next.js server instrumentation (Sentry)
├── instrumentation-client.ts # Client instrumentation
├── proxy.ts                  # Proxy configuration
└── sentry.*.config.ts        # Sentry edge/server config
```


## Features (`src/features/`)

12 feature slices currently present. Layers listed reflect what each slice actually contains.

| Feature | Layers present | Responsibility |
|---------|----------------|----------------|
| **dictionary** | db, services, schemas, hooks, lib, ui, client | Lookup / search / suggest / entry-detail. |
| **vocabulary** | actions, db, services, schemas, hooks, ui, client | Save & manage vocabulary (Server Actions pattern). |
| **reading** | db, services, schemas, hooks, lib, ui | Reading view + inline/word translation, scroll progress, CEFR styling. |
| **studio-panel** | hooks, schemas, lib, ui | Studio workspace (AI chat, generated questions/artifacts). |
| **source-panel** | hooks, ui | Source/document management panel. |
| **learning-session** | db, schemas, hooks, ui, client | Learning session lifecycle & tracking. |
| **upload** | db, services, schemas, lib, ui | File upload → text extraction → content analysis. |
| **progress** | db, hooks, ui | Progress stats & tracking UI. |
| **passage** | db, services | Passage persistence & study-artifact operations. |
| **ai-chat** | services, lib | AI chat service for learning assistance. |
| **users** | db | User sync (Clerk → DB). |
| **study** | shared | Shared study-domain types. |

## Data Access Patterns

### Server Actions (preferred for mutations)

Features use Server Actions for writes. Pattern:
- **Server Action** (`features/<f>/actions.ts`): `"use server"`, validates input, calls service, calls `revalidatePath()`
- **Client** uses `useActionState` to invoke actions

Example (`vocabulary/actions.ts`):
```typescript
export async function saveVocabularyAction(input: SaveVocabularyInput) {
  const parsed = saveVocabularySchema.parse(input);  // Zod validation
  const userId = await getUserId();
  const result = await saveVocabularyItem({ ...parsed, userId });
  revalidatePath("/vocabulary");
  return { success: true, data: result };
}
```

### Server Components (preferred for reads)

- **Server Component** fetches data at render time via direct service calls
- Data passed to Client Component via props
- No client-side fetch for reads

### Server Actions for interaction-time reads

Reads triggered by user interaction (typeahead, click-to-load) can't run in a
Server Component (which only runs at render time), so they use a **read Server
Action** instead of a client `fetch` to an API route. Same `"use server"` +
Zod + `getUserId()` shape as mutation actions, but no `revalidatePath()`.

Example (`dictionary/actions.ts`):
- `suggestDictionaryTermsAction` — as-you-type suggestions
- `getDictionaryEntryDetailAction` — full entry on click (returns `null` on miss)

### API Routes

Only endpoints that a Server Action cannot replace remain as API routes:
streaming responses, URL-addressed resources, and external callers.
Everything else (upload, learning session, studio questions, vocabulary,
dictionary) goes through Server Actions.

| Feature | Route | Method | Why it stays a route |
|---------|-------|--------|-----------------------|
| **Translate** | `/api/translate` | POST | Selection-driven; fetch keeps abort/cancel option |
| **Studio Chat** | `/api/studio/chat` | POST | Streams tokens to the AI SDK chat hook |
| **Local Blob** | `/api/local-blob/[pathname]` | GET | URL-addressed blob serving (`<img src>`) |
| **Health** | `/api/health` | GET | Called by infra, not the app |
| **Clerk Webhook** | `/api/webhooks/clerk` | POST | Called by Clerk's servers |

## Key Design Patterns

### 1. Data Access Patterns (Server Actions + Server Components)

**Reads → Server Components:**
- Direct service calls at render time
- No client-side fetch for reads
- Data passed to Client Component via props

**Writes → Server Actions:**
- `"use server"` directive
- Zod validation for input
- `getUserId()` for auth
- `revalidatePath()` for cache invalidation
- Client uses `useActionState` to invoke

**Interaction-time reads → Server Actions:**
- Typeahead / click-to-load reads that can't run in a Server Component
- `"use server"` + Zod + `getUserId()`, no `revalidatePath()`
- e.g. `dictionary/actions.ts` (suggest, entry detail)

### 2. Request/Response Layering (see `code-standards.md`)
- API routes (`app/api/**/route.ts`) parse + validate requests (zod)
- `features/<feature>/services/` own business logic + DTO construction
- `features/<feature>/db/` repositories handle DB access only
- DTOs defined via `features/<feature>/schemas/` (schemas + inferred types)

### 3. Error Handling
- Custom service errors thrown; routes translate to HTTP status codes
- Sentry integration for error tracking
- Request logging with context (userId, feature, method, path)

### 4. Authentication
- Clerk (`services/clerk.ts`); user sync via `features/users/db/sync-user.ts`
- Most routes require authentication; returns 401 if missing
- Session management via Next.js middleware

### 5. Logging
- Every action and query logs with structured context
- Uses `createModuleLogger` from `@/lib/logger`
- Logs include: userId, operation, entityId, duration, success/error


## Entry Points

- **Frontend:** `src/app/[locale]/` (Next.js App Router pages)
- **Server Actions:** `src/features/<feature>/actions.ts`
- **API:** `src/app/api/**/route.ts` 
- **Database:** Prisma schema (not listed here; see `prisma/schema.prisma`)
- **Features (full slice):** `src/features/<feature>/` — actions, db, services, schemas, hooks, UI colocated
