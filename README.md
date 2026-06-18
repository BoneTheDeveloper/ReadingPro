# English Reading Training App

AI-assisted reading trainer for English learners. Learners upload or paste English content, study it in a guided workspace, translate selections, ask passage-grounded tutor questions, and review generated cards with spaced repetition.

## What It Does

- Upload text or PDF reading material.
- Persist learner-owned passages with CEFR metadata.
- Simplify content and generate comprehension questions.
- Study in a three-panel workspace with reading, quiz, translation, and chat surfaces.
- Translate selected English text to Vietnamese, cache translation results, and save vocabulary.
- Search a seeded English-Vietnamese dictionary.
- Review cards with SM-2 scheduling and track progress.

## Stack

| Layer | Technology |
|-------|------------|
| App | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS, shadcn-style primitives, Lucide icons |
| Auth | Clerk |
| Database | Neon PostgreSQL, Prisma |
| Storage | Local filesystem in development, Vercel Blob in preview/production |
| AI | Vercel AI SDK with OpenAI/Google provider packages |
| Observability | Sentry, Pino |
| Tests | Vitest, Testing Library, performance scripts |

## Quick Start

Prerequisites:

- Node.js `24.x`
- pnpm `11.3.0`
- Clerk application
- Neon PostgreSQL database
- OpenAI API key
- Vercel Blob store for preview/production uploads

Install dependencies:

```bash
pnpm install
```

Create local env:

```bash
cp .env.example .env.local
```

Set the required local values:

- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `DIRECT_URL`

**Clerk webhook (required for user profile sync):**

The app receives Clerk lifecycle events at `POST /api/webhooks/clerk` to keep `UserProfile` in sync. To enable locally:

1. Install the [Clerk CLI](https://clerk.com/docs/deployments/webhooks) or use the Clerk dashboard to create a webhook endpoint pointing to your tunnel URL (e.g. `https://your-tunnel.ngrok.io/api/webhooks/clerk`).
2. Subscribe to `user.created`, `user.updated`, and `user.deleted` events.
3. Copy the signing secret into `CLERK_WEBHOOK_SIGNING_SECRET` in `.env.local`.

In production/preview, set `CLERK_WEBHOOK_SIGNING_SECRET` as an environment variable in your Vercel project and configure the Clerk webhook endpoint to your deployed URL.

Optional model overrides:

- `OPENAI_STUDY_CHAT_MODEL`
- `OPENAI_TRANSLATION_MODEL`

Generate Prisma client and run development migrations:

```bash
pnpm db:generate
pnpm db:migrate:dev
```

Start the app:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

## Common Commands

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm build
pnpm start
```

Dictionary seed/import helpers:

```bash
pnpm db:seed:dictionary
pnpm db:validate:dictionary
pnpm db:check:dictionary-seed
```

## Documentation

- Docs index: [docs/README.md](docs/README.md)
- Product overview: [docs/Product/overview-pdr.md](docs/Product/overview-pdr.md)
- Codebase summary: [docs/codebase-summary.md](docs/codebase-summary.md)
- System architecture: [docs/Architecture/system-architecture.md](docs/Architecture/system-architecture.md)
- API index: [docs/API/api-index.md](docs/API/api-index.md)

## Source-Of-Truth Notes

- Prisma migration procedure lives in [prisma/migrations-guide.md](prisma/migrations-guide.md).
- Prisma/Neon security rules live in [prisma/SECURITY.md](prisma/SECURITY.md).
- Test strategy lives in [docs/Testing/testing-strategy.md](docs/Testing/testing-strategy.md).
