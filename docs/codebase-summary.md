# Codebase Summary

English Reading Training App — Full-stack Next.js application for language learning with vocabulary tracking, dictionary lookup, passage analysis, and AI-assisted translation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript 6, Tailwind CSS v4, shadcn/ui (Base UI + Radix) |
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Runtime** | Node.js 24, pnpm |
| **Backend** | Next.js API routes (Node.js) |
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
│   │   └── <domain>/         # e.g. dictionary/, vocabulary/, studio/, upload/, translate/
│   └── [locale]/             # Localized UI routes
│       ├── (auth)/           # sign-in, sign-up
│       └── (dashboard)/      # dictionary, study, upload, vocabulary, progress, processing
│
├── features/                 # Vertical feature slices (see pattern + list below)
│   └── <feature>/            # e.g. dictionary/, vocabulary/, reading/ ...
│
├── components/               # Shared React components (cross-feature)
│   ├── ui/                   # Shadcn/ui primitives (button, dialog, ... — 14 files)
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

### Feature slice pattern

A feature folder repeats the same shape. `dictionary/` is the canonical, most complete example:

```
features/dictionary/
├── dictionary-client.ts      # Typed fetch wrapper (client → API)
├── db/                       # Repositories: raw Prisma access (lookup/search/suggest/entry-detail)
├── services/                 # Business logic + DTO builders (dto-builders.ts, lookup-service.ts, ...)
├── schemas/                  # Zod schemas + inferred types (z.infer); files use the *.schema.ts suffix
├── hooks/                    # React data hooks (use-dictionary-suggest, ...)
├── lib/                      # Feature-local helpers (dictionary-helpers.ts)
└── ui/                       # React components (dictionary-page-client.tsx, ...)
```

Not every feature has every layer — thinner slices only carry what they need (e.g. `users/`
is just `db/sync-user.ts`; `study/` is just `shared/types.ts`).

## Features (`src/features/`)

12 feature slices currently present. Layers listed reflect what each slice actually contains.

| Feature | Layers present | Responsibility |
|---------|----------------|----------------|
| **dictionary** | db, services, schemas, hooks, lib, ui, client | Lookup / search / suggest / entry-detail. Canonical full-stack slice. |
| **vocabulary** | db, hooks, model, ui, client | Save & manage user vocabulary (list, sets, stats). |
| **reading** | components, db, hooks, lib, schemas | Reading view + inline / word translation, scroll progress, CEFR styling. |
| **studio-panel** | actions, api-client, hooks, schemas, ui | Studio workspace (AI chat, generated questions/artifacts). |
| **source-panel** | api-client, hooks, ui | Source/document management panel. |
| **learning-session** | db, hooks, schemas, ui, client | Learning session lifecycle & tracking. |
| **upload** | db (content-analysis, parsers/pdf, workflow), schemas | File upload → text extraction → content analysis. |
| **progress** | components, db, hooks | Progress stats & tracking UI. |
| **passage** | db (queries, study repo/service, studio-artifacts) | Passage persistence & study-artifact operations. |
| **ai-chat** | chat-service, chat-utils | AI chat service for learning assistance. |
| **users** | db (sync-user) | User sync (Clerk → DB). |
| **study** | shared (types) | Shared study-domain types. |

## API Endpoints

| Feature | Route | Method | Responsibility |
|---------|-------|--------|-----------------|
| **Dictionary Lookup** | `/api/dictionary/lookup` | GET | Find entry by term |
| **Dictionary Search** | `/api/dictionary/search` | GET | Full-text search entries |
| **Dictionary Suggest** | `/api/dictionary/suggest` | GET | Prefix/fuzzy suggest |
| **Dictionary Entry Detail** | `/api/dictionary/entries/[entryId]` | GET | Get single entry by ID |
| **Vocabulary** | `/api/vocabulary` | POST | Save new vocabulary item |
| **Vocabulary List** | `/api/vocabulary/list` | GET | List user's vocabulary |
| **Vocabulary Stats** | `/api/vocabulary/stats` | GET | Aggregate vocabulary stats |
| **Vocabulary Item** | `/api/vocabulary/[id]` | DELETE | Delete an item |
| **Vocabulary Item Status** | `/api/vocabulary/[id]/status` | PATCH | Update learning status |
| **Vocabulary Item Review** | `/api/vocabulary/[id]/review` | POST | Record a spaced-repetition review |
| **Vocabulary Sets** | `/api/vocabulary/sets` | GET/POST | List / create sets |
| **Vocabulary Set** | `/api/vocabulary/sets/[id]` | PATCH/DELETE | Rename / delete a set |
| **Vocabulary Set Items** | `/api/vocabulary/sets/[id]/items` | POST | Add item to set |
| **Vocabulary Set Item** | `/api/vocabulary/sets/[id]/items/[itemId]` | DELETE | Remove item from set |
| **Translate** | `/api/translate` | POST | Inline text/word translation |
| **Studio Chat** | `/api/studio/chat` | POST | AI chat for learning help |
| **Studio Questions** | `/api/studio/questions` | POST | Generate study questions |
| **Upload** | `/api/upload` | POST | Upload file; extract content |
| **Upload Text** | `/api/upload/text` | POST | Ingest raw text |
| **Learning Session** | `/api/learning-session` | POST | Create/advance a learning session |
| **Progress Stats** | `/api/progress/stats` | GET | Reading/learning progress metrics |
| **Local Blob** | `/api/local-blob/[pathname]` | GET | Serve locally stored blobs |
| **Health** | `/api/health` | GET | Health check |
| **Clerk Webhook** | `/api/webhooks/clerk` | POST | Clerk user sync webhook |

## Key Design Patterns

### 1. Request/Response Layering (see `code-standards.md`)
- API routes (`app/api/**/route.ts`) parse + validate requests (zod)
- `features/<feature>/services/` own business logic + DTO construction
- `features/<feature>/db/` repositories handle DB access only
- DTOs defined via `features/<feature>/schemas/` (schemas + inferred types)

### 2. Error Handling
- Custom service errors thrown; routes translate to HTTP status codes
- Sentry integration for error tracking
- Request logging with context (userId, feature, method, path)

### 3. Authentication
- Clerk (`services/clerk.ts`); user sync via `features/users/db/sync-user.ts`
- Most routes require authentication; returns 401 if missing
- Session management via Next.js middleware

### 4. Frontend Validation
- Response types imported directly from `features/<feature>/schemas/*.schema.ts`
- Validated client-side with `.safeParse(responseSchema)` via typed `<feature>-client.ts` wrappers


## Entry Points

- **Frontend:** `src/app/[locale]/` (Next.js App Router pages)
- **API:** `src/app/api/**/route.ts` (HTTP handlers)
- **Database:** Prisma schema (not listed here; see `prisma/schema.prisma`)
- **Features (full slice):** `src/features/<feature>/` — DB, services, schemas, hooks, UI colocated
