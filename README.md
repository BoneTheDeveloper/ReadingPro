# English Reading Training App

## Prerequisites

- Node.js
- pnpm 10.33.2 or newer
- A Supabase project with a PostgreSQL database
- An OpenAI API key for AI features



## Install Dependencies

Install the project dependencies from the lockfile:

```bash
pnpm install
```

## Configure Environment Variables

Create your local environment file:

```bash
cp .env.example .env.local
```

Then update `.env.local` with your own values:

- `OPENAI_API_KEY`
- `OPENAI_STUDY_CHAT_MODEL` (optional, defaults to `gpt-4o-mini` when missing/empty/invalid)
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`

`DATABASE_URL` should use the Supabase pooled connection string. `DIRECT_URL` should use the direct database connection string for Prisma migrations.

For production OAuth redirects, set `NEXT_PUBLIC_SITE_URL` to your deployed host, for example `https://your-app.vercel.app`.

## Set Up the Database

Generate the Prisma client:

```bash
pnpm db:generate
```

Run database migrations in development:

```bash
pnpm db:migrate:dev
```

## Start the Project

Start the development server:

```bash
pnpm dev
```

Open the app at:

```text
http://localhost:3000
```

## Run Browser Tests and Screenshots

Playwright E2E uses a pre-created Supabase Auth test user. Add the user credentials to `.env.test`:

```bash
E2E_TEST_USER_EMAIL=reader@example.com
E2E_TEST_USER_PASSWORD=secure-password
```

Then run:

```bash
pnpm e2e
pnpm e2e:screenshot
make screenshot PAGE=/en/study NAME=study
```

Screenshots are written to `generated/screenshot/`. See `tests/e2e/README.md` for project split, CI secrets, and database readiness details.

On host OS versions unsupported by Playwright browser downloads, use `pnpm e2e:docker` and `make screenshot PAGE=/en/study NAME=study`.

## Production Commands

Build the project:

```bash
pnpm build
```

Start the production server:

```bash
pnpm start
```
