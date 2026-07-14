# Codebase Summary

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Database | PostgreSQL with Prisma ORM 7 |
| Authentication | Better Auth (email/password + Google OAuth) |
| Validation | Zod 4 |
| AI | Vercel AI SDK, OpenAI (via @ai-sdk/openai) |
| Background Jobs | Inngest |
| Observability | Sentry, Pino (logging) |
| File Storage | @vercel/blob (with local fallback) |
| i18n | next-intl |

## Source Layout

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # HTTP routes
│   │   ├── ai-chat/        # AI chat endpoint
│   │   ├── auth/           # Better Auth routes
│   │   ├── health/        # Health check
│   │   ├── inngest/       # Inngest webhook
│   │   ├── local-blob/    # Local blob storage
│   │   └── translate/     # Translation API
│   └── [locale]/           # UI routes with i18n
│
├── features/                 # Vertical slices
│   ├── dictionary/          # Dictionary lookup/search
│   ├── vocabulary/          # Vocabulary management
│   ├── reading/             # Reading view + inline translation
│   ├── studio-panel/        # AI chat + quiz generation
│   ├── upload/             # File upload & processing
│   └── passage/            # Passage persistence
│       ├── components/      # React components
│       ├── hooks/          # React hooks
│       ├── lib/            # Feature utilities
│       ├── schemas/        # Zod schemas
│       └── server/         # Server-side code
│           ├── actions/    # Server Actions
│           ├── db/        # Repositories
│           ├── services/   # Business logic
│           └── inngest/   # Background jobs
│
├── components/              # Shared UI components
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components
│   ├── auth/              # Auth components
│   └── provider/          # Context providers
│
├── services/               # App-level services
│   ├── ai/               # AI model config & prompts
│   ├── inngest.ts        # Inngest client
│   └── storage.ts         # Blob storage
│
├── lib/                   # Shared utilities
│   ├── auth/             # Better Auth setup
│   ├── errors/           # Domain errors
│   ├── http/             # HTTP utilities
│   ├── prisma.ts         # Prisma client
│   ├── logger.ts         # Pino logger
│   └── utils.ts          # Common utilities
│
├── i18n/                  # Internationalization
├── types/                 # Shared TypeScript types
├── generated/             # Generated Prisma client
└── instrumentation*.ts   # Sentry instrumentation
```

## Features

| Feature | Responsibility |
|---------|----------------|
| dictionary | Dictionary lookup, search, autocomplete suggestions |
| vocabulary | Save & manage vocabulary with spaced repetition |
| reading | Reading view with inline translation |
| studio-panel | AI chat about passages, quiz/question generation |
| upload | Upload files (text, PDF, YouTube), background processing |
| passage | Reading passage persistence with CEFR levels |

## Database Schema (Prisma)

**Core Enums:**
- `CEFRLevel`: A1, A2, B1, B2, C1, C2
- `SourceType`: TEXT, PDF, YOUTUBE
- `QuestionType`: MULTIPLE_CHOICE, TRUE_FALSE
- `VocabularyStatus`: NEW, LEARNING, MASTERED
- `UploadStatus`: PENDING, PROCESSING, DONE, FAILED

**Key Models:**
- `UserProfile` - Extended user profile linking to all app data
- `Passage` - Reading passages with word count, CEFR level
- `DictionaryEntry` / `DictionarySense` / `DictionaryTranslation` - Bilingual dictionary
- `VocabularyItem` - User vocabulary with spaced repetition
- `StudioArtifact` - AI-generated content from passages
- `Question` / `QuizResult` - Quiz and results
- `TranslationCache` - Translation caching
- `UploadJob` - Background job tracking

## Key Patterns

**Error Architecture:** Domain errors in `lib/errors/`, feature errors extend base. Routes use `withRoute()` + `toHttp()`.

**Schema Architecture:** Data schemas in `features/`, response contracts via `makeApiResponseSchema()`. Clients validate with `safeParse()`.

**Logging:** Pino in `lib/logger.ts`. Request context via `createModuleLogger()`.

**Background Processing:** Inngest for async job processing (upload processing, AI analysis).

## Entry Points

| Type | Location |
|------|----------|
| Frontend | `src/app/[locale]/` |
| Server Actions | `src/features/<f>/server/actions/` |
| API Routes | `src/app/api/**/route.ts` |

## Authentication

**Implementation:** Better Auth with Prisma adapter

- **Providers:** Email/password (enabled), Google OAuth
- **Database Hooks:** Auto-creates `UserProfile` on user creation
- **Server Helpers:**
  - `getSession()` - Get session from headers
  - `getUserId()` - Get authenticated user ID
  - `getCurrentUser()` - Get user profile
