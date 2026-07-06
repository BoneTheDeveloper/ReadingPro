# Codebase Summary

English Reading Training App — Full-stack Next.js application for language learning with vocabulary tracking, dictionary lookup, passage analysis, and AI-assisted translation.

## Source Layout

```
src/
├── app/                          # Next.js App Router + API endpoints
│   ├── api/
│   │   ├── dictionary/           # Dictionary lookup, search, suggest, entry detail
│   │   ├── vocabulary/           # Save, list vocabulary items
│   │   ├── translation/          # Inline translation (text/word level)
│   │   ├── content-analysis/     # Analyze passage/content
│   │   ├── ai-chat/              # AI chat for learning assistance
│   │   ├── upload/               # File upload and processing
│   │   ├── passage/              # Passage operations
│   │   ├── study/                # Study session endpoints
│   │   └── learning-session/     # Learning session management
│   └── (pages)                   # UI routes (not enumerated; see app/ subdirs)
│
├── server/                       # Backend logic (Node.js layer)
│   ├── modules/                  # Feature modules (canonical location)
│   │   ├── dictionary/           # Dictionary feature
│   │   │   ├── lookup/           # lookup.service.ts, lookup.repository.ts
│   │   │   ├── search/           # search.service.ts, search.repository.ts
│   │   │   ├── suggest/          # suggest.service.ts, suggest.repository.ts
│   │   │   ├── entry-detail/     # entry-detail.service.ts, entry-detail.repository.ts
│   │   │   ├── shared/           # dictionary-dto-builders.ts (shared mappers)
│   │   │   └── lookup-quick.service.ts
│   │   ├── vocabulary/           # Vocabulary feature (service + repository)
│   │   ├── translation/          # Translation feature (inline translation service)
│   │   ├── ai-chat/              # AI chat service
│   │   ├── passage/              # Passage operations
│   │   ├── upload/               # Upload/content analysis
│   │   └── spaced-repetition/    # Spaced repetition logic
│   │
│   ├── db/                       # Legacy direct Prisma queries (being migrated to modules/)
│   │   ├── vocabulary/           # vocabulary-queries.ts (still called by routes)
│   │   └── ...
│   │
│   ├── auth/                     # Authentication utilities
│   │   └── auth-utils.ts         # getUserId(), session validation
│   │
│   ├── http/                     # HTTP utilities
│   │   └── route-errors.ts       # Error type checking
│   │
│   ├── observability/            # Logging and monitoring
│   │   └── logger.ts             # Request logging, context creation
│   │
│   ├── ai/                       # AI integration utilities
│   │
│   └── storage/                  # File storage
│
├── contracts/                    # Zod schemas + inferred DTO types
│   ├── dictionary/               # Dictionary response/request schemas
│   │   ├── dictionary-response-schema.ts
│   │   ├── dictionary-dtos.ts
│   │   └── normalize-dictionary-term.ts
│   │
│   ├── translation/              # Translation response/request schemas
│   │   └── ...
│   │
│   ├── upload/                   # Upload response schemas
│   │   └── ...
│   │
│   ├── learning-session/         # Learning session schemas
│   │   └── ...
│   │
│   ├── study/                    # Study schemas
│   │   └── ...
│   │
│   ├── domain/                   # Domain models (User, Source, etc.)
│   │   └── ...
│   │
│   ├── http/                     # Shared HTTP envelope builders
│   │   └── api-response-schema.ts
│   │
│   └── MISSING: vocabulary/, passage/
│        (These features lack a contracts layer; see code-standards.md anti-pattern section)
│
├── features/                     # Frontend feature modules (React)
│   ├── dictionary/               # Dictionary UI, hooks, client
│   │   ├── dictionary-client.ts  # Fetch + type validation wrapper
│   │   └── ...
│   │
│   ├── vocabulary/               # Vocabulary UI, hooks, client
│   │   ├── vocabulary-client.ts  # Fetch wrapper (no response validation)
│   │   ├── model/vocabulary-types.ts (hand-written; diverges from API)
│   │   ├── hooks/
│   │   │   ├── use-vocabulary-list.ts
│   │   │   ├── use-vocabulary-sets.ts
│   │   │   └── use-vocabulary-stats.ts
│   │   └── ...
│   │
│   ├── translation/              # Inline translation UI
│   ├── learning-session/         # Learning session UI
│   ├── study/                    # Study session UI
│   ├── study-workspace/          # Study workspace container
│   ├── progress/                 # Progress tracking UI
│   ├── content-panel/            # Content display
│   ├── source-panel/             # Source management UI
│   ├── studio-panel/             # Studio/admin UI
│   └── ...
│
├── components/                   # Shared React components
│   ├── ui/                       # Shadcn/ui components
│   ├── layout/                   # Layout components
│   ├── provider/                 # Context providers
│   └── system/                   # System components
│
├── lib/                          # Shared utilities (TypeScript)
│   └── ...
│
├── i18n/                         # Internationalization config
│   └── ...
│
├── generated/                    # Auto-generated code
│   └── prisma/                   # Prisma client (do not edit)
│
├── instrumentation.ts            # Next.js instrumentation
├── instrumentation-client.ts     # Client-side instrumentation
└── proxy.ts                      # Proxy configuration
```

## Feature Modules Overview

| Feature | Modules | Contracts | Notes |
|---------|---------|-----------|-------|
| **Dictionary** | `server/modules/dictionary/{lookup,search,suggest,entry-detail}` | ✅ `contracts/dictionary/` | Canonical correct implementation; uses service layer + DTO builders |
| **Vocabulary** | `server/modules/vocabulary/` | ❌ MISSING | Anti-pattern; no contracts, DTO mapper in API route, route calls repository directly |
| **Translation** | `server/modules/translation/` | ✅ `contracts/translation/` | Inline word/text translation |
| **Passage** | `server/modules/passage/` | ❌ MISSING | Passage reading and analysis operations |
| **AI Chat** | `server/modules/ai-chat/` | ✅ (via domain) | Chat-based learning assistance |
| **Upload** | `server/modules/upload/` | ✅ `contracts/upload/` | File upload, content analysis |
| **Study** | (routes only, no dedicated module) | ✅ `contracts/study/` | Study session management |
| **Learning Session** | (routes only, no dedicated module) | ✅ `contracts/learning-session/` | Session tracking |
| **Spaced Repetition** | `server/modules/spaced-repetition/` | (implicit) | Repetition scheduling logic |

## API Endpoints

| Feature | Route | Method | Responsibility |
|---------|-------|--------|-----------------|
| **Dictionary Lookup** | `/api/dictionary/lookup` | GET/POST | Find entry by term (with performance metrics) |
| **Dictionary Search** | `/api/dictionary/search` | GET/POST | Full-text search entries |
| **Dictionary Suggest** | `/api/dictionary/suggest` | GET/POST | Prefix/fuzzy suggest |
| **Dictionary Entry Detail** | `/api/dictionary/[id]` | GET | Get single entry by ID |
| **Vocabulary Save** | `/api/vocabulary` | POST | Save new vocabulary item |
| **Vocabulary List** | `/api/vocabulary/list` | GET | List user's vocabulary (with pagination) |
| **Inline Translation** | `/api/translation/inline` | POST | Translate text/word inline |
| **Content Analysis** | `/api/content-analysis` | POST | Analyze passage for difficulty, entities |
| **AI Chat** | `/api/ai-chat` | POST | Chat with AI for learning help |
| **Upload** | `/api/upload` | POST | Upload file; extract text content |
| **Passage** | `/api/passage` | POST/GET | Create/fetch passage |
| **Study** | `/api/study/**` | GET/POST | Study session operations |
| **Learning Session** | `/api/learning-session/**` | GET/POST | Learning session management |

## Key Design Patterns

### 1. Request/Response Layering (see `code-standards.md`)
- API routes parse + validate requests (zod)
- Services own business logic + DTO construction
- Repositories handle DB access only
- DTOs defined via `contracts/` (schemas + inferred types)

### 2. Error Handling
- Custom service errors thrown; routes translate to HTTP status codes
- Sentry integration for error tracking
- Request logging with context (userId, feature, method, path)

### 3. Authentication
- `getUserId()` from `server/auth/auth-utils.ts`
- Most routes require authentication; returns 401 if missing
- Session management via Next.js middleware (not enumerated)

### 4. Frontend Validation
- Response types imported from `contracts/<feature>/*-dtos.ts`
- Ideally validated with `.safeParse(responseSchema)` (not yet universal)
- Currently some routes use blind `as Type` casts (weaker pattern)

## Known Gaps & Migration Paths

| Item | Status | Action |
|------|--------|--------|
| Vocabulary module | No contracts layer | Create `contracts/vocabulary/{*-response-schema.ts,*-dtos.ts}`; move DTO builder to service |
| Passage module | No contracts layer | Create `contracts/passage/{*-response-schema.ts,*-dtos.ts}` |
| `server/db/vocabulary/*` | Legacy direct queries | Migrate to service layer (replace direct repository calls in routes) |
| Blind `as Type` casts | Weak validation | Replace with `.safeParse(responseSchema)` across all features |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, TailwindCSS, Shadcn/ui |
| **Framework** | Next.js 14+ (App Router) |
| **Backend** | Node.js, Express (via Next.js API routes) |
| **Database** | PostgreSQL, Prisma ORM |
| **Validation** | Zod |
| **Observability** | Sentry, custom request logger |
| **AI** | Google AI SDK (Gemini integration) |
| **i18n** | i18next |

## Entry Points

- **Frontend:** `src/app/` (Next.js App Router pages)
- **API:** `src/app/api/**/route.ts` (HTTP handlers)
- **Database:** Prisma schema (not listed here; see `prisma/schema.prisma`)
- **Features (Backend):** `src/server/modules/<feature>/`
- **Features (Frontend):** `src/features/<feature>/`
