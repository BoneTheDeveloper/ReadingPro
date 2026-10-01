# Reading Pro

A study workspace for English learners: bring in a passage from any source, read it in a
focused reader, check comprehension with AI-generated artifacts, capture vocabulary in
context, and review it later.

## Why this exists

Learners collect reading material in many formats (articles, PDFs, YouTube talks) but lose
the study loop: understanding checks, word meaning in context, and repetition. Reading Pro
keeps a passage and everything derived from it — questions, chat, saved words — in one
owned workspace.

## What it does

| Area | Capability |
|---|---|
| [Content import](docs/Requirements/epic-01-content-import.md) | Paste text, upload a PDF, or bring a YouTube link in as a passage |
| [Study & comprehension](docs/Requirements/epic-02-study-comprehension.md) | Generate comprehension questions and flashcards over a passage |
| [Passage chat](docs/Requirements/epic-03-passage-chat.md) | Ask a tutor grounded in the passage you are reading |
| [Vocabulary capture](docs/Requirements/epic-04-vocabulary-capture.md) | Inline translation while reading, then save words with their context |
| [Memorization & review](docs/Requirements/epic-05-memorization-review.md) | Group saved words into sets and review them on an FSRS spaced-repetition schedule |

## Tech stack

- **React Router** (SPA mode, landing page prerendered) · **Vite** · **React** · **TypeScript**
- **Hono** API on **Nitro** · **Workflow SDK** for background processing
- **Tailwind CSS** · **shadcn/ui** (Radix primitives)
- **TanStack Query** for client data
- **Prisma** · **PostgreSQL**
- **Better Auth** (Google sign-in)
- **Vercel AI SDK** for translation, passage processing, questions, and chat
- **pino** for errors and logs
- **pnpm** · deployed on **Vercel**

## Directory map

```
src/
│  ── client (browser bundle) ──
├─ client/                    # React Router appDirectory
│  ├─ root.tsx                # document shell, providers, error boundary
│  ├─ routes.ts               # route config
│  ├─ routes/                 # marketing, login, dashboard layout, study, vocabulary, review, account
│  │  └─ study/               # study page view: composes passage, reading and studio panels
│  ├─ features/               # one folder per domain; import it through its index.ts
│  │  ├─ auth/                # login form, account controls
│  │  ├─ passage/             # import UI, library panel
│  │  ├─ reading/             # reader panel, selection, inline translation
│  │  ├─ studio/              # study workspace; artifacts: questions, flashcards, passage chat
│  │  └─ vocabulary/          # word bank, sets, review session
│  ├─ components/             # shared UI: layout and shadcn/ui (components/ui)
│  └─ lib/                    # auth client, fetch helpers, query client, store
│  ── shared (imported by both sides) ──
├─ shared/
│  ├─ api-error.ts            # API error envelope, codes and reasons (translation keys)
│  ├─ enums.ts                # browser-safe copies of Prisma enums (sync-checked on the server)
│  ├─ passage/                # passage schemas, upload limits, YouTube URL parsing
│  ├─ reading/                # translation schemas
│  ├─ studio/                 # artifact and chat schemas
│  └─ vocabulary/             # vocabulary, set and review schemas
│  ── server (Nitro) ──
└─ server/
   ├─ app.ts                  # Hono app: auth handler, request context, module routes, onError
   ├─ env.ts                  # Hono context types (request logger, signed-in user)
   ├─ middleware/             # request id and logger per request, requireSession
   ├─ modules/                # one folder per domain; import it through its index.ts
   │  ├─ auth/                # better-auth instance
   │  ├─ passage/             # import, ingestion (normalization, AI rewrite), processing workflow
   │  ├─ artifact/            # questions and flashcards, generation workflow
   │  ├─ chat/                # passage chat, tutor prompts, history
   │  ├─ translate/           # word translation
   │  └─ vocabulary/          # items/, sets/, review/, FSRS scheduler
   ├─ lib/                    # prisma, logger, errors and onError, validation, enum sync check
   └─ db/generated/           # generated Prisma client — do not edit

prisma/schema.prisma          # database schema
prisma/migrations/            # SQL migrations; apply with `pnpm exec prisma migrate deploy`
```

Client and server code only meet in `src/shared/`. ESLint (`no-restricted-imports`
in `eslint.config.mjs`) enforces this, and that features and server modules are
imported only through their `index.ts`.

Inside a server module, `*-routes.ts` handles HTTP only (validate, call a service,
shape the response), `*-service.ts` holds the use cases, and `*-repository.ts`,
where present, is the only file that queries the module's tables. Client code gets Prisma enums from
`@/shared/enums`; `src/server/lib/enum-sync.ts` fails typecheck if they drift
from the schema.

API errors use one envelope, `{ error: { code, reason, message, details? } }`
(`src/shared/api-error.ts`). Server code throws `new AppError(reason, message)`;
`reason` fixes the status and code, and `message` is English for logs only. The
client turns reasons into user-facing text in `src/client/lib/api/error-message.ts`,
the single catalog of error strings, so adding a language means translating that file.

## Development

```
pnpm dev        # dev:api + dev:web together
pnpm dev:web    # Vite on :3000 only (proxies /api to :3001)
pnpm dev:api    # Nitro API on :3001 only
pnpm build      # prisma generate, build:web, then build:api
pnpm build:web  # react-router build → build/client
pnpm build:api  # nitro build → .output (bundles build/client, so run build:web first)
pnpm start      # serve .output with .env loaded
```
