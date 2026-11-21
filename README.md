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


| Area                                                                          | Capability                                                                        |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Content import](docs/Requirements/epic-01-content-import.md)                 | Paste text, upload a PDF, or bring a YouTube link in as a passage                 |
| [Study &amp; comprehension](docs/Requirements/epic-02-study-comprehension.md) | Generate comprehension questions and flashcards over a passage                    |
| [Passage chat](docs/Requirements/epic-03-passage-chat.md)                     | Ask a tutor grounded in the passage you are reading                               |
| [Vocabulary capture](docs/Requirements/epic-04-vocabulary-capture.md)         | Inline translation while reading, then save words with their context              |
| [Memorization &amp; review](docs/Requirements/epic-05-memorization-review.md) | Group saved words into sets and review them on an FSRS spaced-repetition schedule |


## Tech stack

- **Web:** React Router (SPA) · Vite · React · TypeScript · Tailwind CSS · shadcn/ui · TanStack Query
- **API:** Hono on Nitro · Workflow SDK for background jobs · Vercel AI SDK
- **Data:** PostgreSQL with raw SQL (`pg`) · Flyway migrations · Docker for local development
- **Auth:** Better Auth (Google sign-in)
- **Deploy:** Vercel · pnpm

## How the code is organized

```
src/client/    React app (pages, features, UI components)
src/server/    API: one module per feature (passage, artifact, chat, vocabulary, ...)
src/shared/    types and schemas used by both sides
db/migrations/ the database schema, as Flyway SQL migrations
```

Each server module follows the same layers: `*-routes.ts` handles HTTP,
`*-service.ts` holds the business rules, and `*-repository.ts` is the only place
with SQL. Client and server code only share `src/shared/`.

## Getting started

**1. Install and configure**

```bash
pnpm install
cp .env.example .env
```

In `.env`, the `POSTGRES_*` variables configure the local database container
(`docker-compose.yml` reads them). The app connects to `DATABASE_URL` when it is
set; without it, the app builds the local URL from the `POSTGRES_*` values.

**2. Start the database**

```bash
pnpm db:up        # starts Postgres, then Flyway creates the tables
```

`docker compose up -d` does the same: it starts the `postgres` service, and
the `flyway` service applies the migrations and exits.

**3. Run the app** in two terminals:

```bash
pnpm dev:api      # API on http://localhost:3001
pnpm dev:web      # web app on http://localhost:3000
```

Open [**http://localhost:3000**](http://localhost:3000). Always use port 3000: it forwards `/api` to the
API, and sign-in only works on this address.

After a reboot, run `pnpm db:up` again before starting the app. Your data is kept.

## Database and migrations

The schema lives in `db/migrations/` and is applied by Flyway.


| Command           | What it does                          |
| ----------------- | ------------------------------------- |
| `pnpm db:up`      | Start Postgres and apply migrations   |
| `pnpm db:down`    | Stop it (data is kept)                |
| `pnpm db:down -v` | Stop it and **delete all local data** |
| `pnpm db:migrate` | Apply new migrations                  |
| `pnpm db:info`    | Show which migrations are applied     |


Flyway runs from `db/Dockerfile`, which copies `db/migrations/` into the image;
the scripts rebuild it, so new files are picked up. It always targets the
`postgres` container, never the database in `DATABASE_URL`.

**To change the schema:**

1. Add a new file `db/migrations/V<next number>__<description>.sql`, for
example `V2__add_passage_language.sql`, with plain Postgres SQL.
2. Run `pnpm db:migrate`.
3. Update the matching `*-repository.ts`. If you changed an enum, also update
`src/shared/enums.ts`; a test checks that they match.

Never edit a migration that has already run; add a new one instead. If the
migration has only ever run on your machine, you can start over with
`pnpm db:down -v && pnpm db:up`.

**New Better Auth plugin?** Run the Better Auth CLI at the installed version to
see which columns are missing, then put that SQL in a new migration:

```bash
pnpm dlx auth@1.7.6 generate --config src/server/modules/auth/auth.ts --output auth-diff.sql
```

Never run Better Auth's own `migrate` command.

## Tests and checks

```bash
pnpm test         # integration tests (needs the local database running)
pnpm typecheck
pnpm lint
```

Tests use the local database and only refuse to run when `DATABASE_URL` is not
on `localhost`. Each test creates its own throwaway users and deletes them, so
your own data is not touched.

## Build and deploy

```bash
pnpm build        # builds the web app and the API into .output
pnpm start        # runs the production build on port 3000
```

**Migrating the production database** is a manual step:

1. Back up first: `pg_dump "<production url>" > backup.sql`
2. Apply the migrations:
   ```bash
    docker build -t readingpro-flyway db
    docker run --rm readingpro-flyway \
      -url="jdbc:postgresql://<host>:5432/<db>?sslmode=require" \
      -user=<user> -password=<password> migrate
   ```



&nbsp;