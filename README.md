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
| [Vocabulary capture](docs/Requirements/epic-04-vocabulary-capture.md)         | Look words up in a built-in dictionary while reading (AI meaning in context on Pro), then save them with their context |
| [Memorization &amp; review](docs/Requirements/epic-05-memorization-review.md) | Group saved words into sets and review them on an FSRS spaced-repetition schedule |


## Tech stack

- **Web:** React Router (SPA) · Vite · React · TypeScript · Tailwind CSS · shadcn/ui · TanStack Query
- **API:** Hono on Nitro · Workflow SDK for background jobs · Vercel AI SDK
- **Data:** PostgreSQL with raw SQL (`pg`) · Flyway migrations · Docker for local development
- **Auth:** Better Auth (Google sign-in, or username/email + password with an emailed OTP)
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
pnpm db:up                  # starts Postgres, then Flyway creates the tables
pnpm db:import-dictionary   # once: loads the English-Vietnamese dictionary
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

**Email for sign-up codes.** Password sign-up needs a password of at least 8
characters with a digit (rules in `src/shared/auth/credential-rules.ts`, used by
both the form and the server). It emails a 6-digit code (valid 5 minutes) that
the user must enter before the account can sign in. "Quên mật khẩu"
(`/forgot-password`) emails a code the same way to set a new password; a
Google-only user can use it to add a password. Set the
`SMTP_*` and `MAIL_FROM` variables in `.env` to send real email (for Gmail, use
`smtp.gmail.com`, port 587 and an
[app password](https://support.google.com/accounts/answer/185833)). Without
`SMTP_HOST`, local development prints the code in the `pnpm dev:api` log
instead; production refuses to sign anyone up until SMTP is set.

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

### Dictionary data

Word lookup reads the `"DictionaryEntry"` table, filled from the OVDP
English-Vietnamese dictionary by Hồ Ngọc Đức (GPLv2). The source archive is
committed in `db/dictionary/`; its origin, license and checksum are in
[`db/dictionary/SOURCE.txt`](db/dictionary/SOURCE.txt).

| Command | What it does |
| ------- | ------------ |
| `pnpm db:import-dictionary` | Load the dictionary (about 117,000 single-word entries). Safe to run again: it replaces the table in one transaction. |
| `pnpm db:dictionary-coverage` | Print how many words of the sample passages the dictionary resolves (target 90%) |

Run the import once after `pnpm db:up` on a new database. For production, take
a backup with `pg_dump` first, then run the import with `DATABASE_URL` set to
the production database.

## Tests and checks

```bash
pnpm test         # integration tests (needs the local database running)
pnpm typecheck
pnpm lint
```

Tests use the local database and only refuse to run when `DATABASE_URL` is not
on `localhost`. The word-lookup tests read the imported dictionary, so run
`pnpm db:import-dictionary` once before the first `pnpm test`. Each test creates its own throwaway users and deletes them, so
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