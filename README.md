# English Reading Training App

## Prerequisites

- Node.js
- pnpm 11.3.0 or newer
- A Clerk application for authentication
- A Neon PostgreSQL database
- A Vercel Blob store for preview/production file uploads
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
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `DATABASE_URL`
- `DIRECT_URL`
- `BLOB_READ_WRITE_TOKEN` (required on Vercel; local dev uses `.local-blob-storage/`)

`DATABASE_URL` should use the Neon pooled runtime connection string. `DIRECT_URL` should use the Neon direct connection string for local and trusted Prisma migration jobs.

Production GitHub Actions also needs `NEON_API_KEY`, `NEON_PROJECT_ID`,
`NEON_PRODUCTION_BRANCH_ID`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
`VERCEL_PROJECT_ID`, and `PRODUCTION_URL` in the protected `production`
environment.

For production auth redirects, set `NEXT_PUBLIC_SITE_URL` to your deployed host, for example `https://your-app.vercel.app`, and configure the same domain in Clerk.

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

Playwright E2E uses a pre-created Clerk development test user. Add the user credentials to `.env.test`:

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
