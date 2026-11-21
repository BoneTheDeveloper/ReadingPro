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
- **PostgreSQL** with raw SQL through **node-postgres** (`pg`) · **Flyway** migrations · local database in **Docker**
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
│  ├─ enums.ts                # browser-safe copies of the Postgres enums (checked by a test)
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
   │  ├─ profile/             # UserProfile queries (settings, profile row lock)
   │  ├─ passage/             # import, ingestion (normalization, AI rewrite), processing workflow
   │  ├─ artifact/            # questions and flashcards, generation workflow
   │  ├─ chat/                # passage chat, tutor prompts, history
   │  ├─ translate/           # word translation
   │  └─ vocabulary/          # items/, sets/, review/, FSRS scheduler
   ├─ lib/                    # db pool and transactions, logger, errors and onError, validation
   └─ test/                   # Vitest setup and test-user helpers

db/migrations/                # Flyway migrations (V<n>__<name>.sql), the whole schema
compose.yaml                  # local Postgres and Flyway
```

Client and server code only meet in `src/shared/`. ESLint (`no-restricted-imports`
in `eslint.config.mjs`) enforces this, and that features and server modules are
imported only through their `index.ts`.

Inside a server module, `*-routes.ts` handles HTTP only (validate, call a service,
shape the response), `*-service.ts` holds the use cases, and `*-repository.ts`,
where present, is the only file that holds SQL for the module's tables. Repositories
return rows, `null` or a boolean; services decide what a missing row means and
throw the `AppError`. All database access goes through the one pool in
`src/server/lib/db.ts`, whose header lists the rules for writing queries. Client
code gets the database enums from `@/shared/enums`;
`src/server/lib/enum-sync.test.ts` fails if they drift from the Postgres enums.

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
pnpm build      # build:web, then build:api
pnpm build:web  # react-router build → build/client
pnpm build:api  # nitro build → .output (bundles build/client, so run build:web first)
pnpm start      # serve .output with .env loaded
pnpm typecheck  # route types, then tsc
pnpm lint       # eslint
pnpm test       # Vitest integration tests against the local database
```

## Database

Flyway owns the whole schema, including the Better Auth tables (`"User"`,
`account`, `session`, `verification`). The app talks to Postgres with raw SQL;
Better Auth uses its built-in Kysely adapter on the same pool.

```
pnpm db:up       # start Postgres in Docker on 127.0.0.1:54329 (POSTGRES_PORT to change)
pnpm db:migrate  # apply db/migrations with Flyway
pnpm db:info     # list the applied migrations
pnpm db:down     # stop the container; `pnpm db:down -v` also deletes the data
```

Set `DATABASE_URL` in `.env` to the value in `.env.example` to use the local
database. The Flyway scripts always target the compose database, whatever
`.env` says. On a Docker host where your user is not in the `docker` group, run
the `db:*` scripts with a Docker-enabled account.

**Adding a migration:** create `db/migrations/V<n>__<snake_case>.sql` with the
next version number. Never edit a version that has been applied anywhere; fix
it with a new version. Use `timestamptz` for timestamps.

**Better Auth plugin columns:** after adding a plugin, run the Better Auth CLI
pinned to the installed version (`pnpm list better-auth`), for example
`pnpm dlx auth@1.7.6 generate --config src/server/modules/auth/auth.ts`, with
`DATABASE_URL` pointing at the migrated local database. Copy what it proposes
into a new Flyway version. Never run Better Auth's own `migrate` command.

**Tests:** `pnpm test` runs on the local dev database. It refuses any
`DATABASE_URL` whose host is not `localhost` or `127.0.0.1`, and fails fast
when Flyway has not applied V1. Each test creates its own `@test.invalid` users
and deletes them afterwards; the cascades remove their data, and nothing else
is touched.

**Production:** take a `pg_dump` backup first, then run Flyway against the
production database:

```
docker run --rm -v "$PWD/db/migrations:/flyway/sql:ro,z" flyway/flyway:11.20.3-alpine \
  -url="jdbc:postgresql://<host>:5432/<db>?sslmode=require" -user=<user> -password=<password> migrate
```

V1 creates every table, so the first run needs an empty database. Then update
`DATABASE_URL` in Vercel if the database changed.
