# Codebase Summary

## Stack

| Layer         | Current choice                                                  |
| ------------- | --------------------------------------------------------------- |
| Framework     | Next.js 16.2 App Router, React 19, RSC                          |
| UI            | Tailwind CSS 4, shadcn-style primitives, Lucide icons           |
| Auth          | Clerk for session and identity, app `UserProfile` for ownership |
| Database      | Neon Postgres, Prisma 7 generated into `src/generated/prisma`   |
| Storage       | Local filesystem in development, private Vercel Blob in preview |
| AI            | Vercel AI SDK, OpenAI and Google provider packages              |
| Validation    | Zod at API/server-action boundaries                             |
| Observability | Sentry, Pino                                                    |
| Tests         | Vitest                        |

## Source Layout

```text
src/
  app/                  Next.js routing layer: thin pages + thin API route handlers
  server/               Backend layer (enforced server-only): db, ai, auth, http, modules
  contracts/            Contract layer (isomorphic/pure): Zod schemas, DTOs, pure utils
  features/             Frontend feature layer (FSD-lite): ui, hooks, model, api
  components/           Universal design system: primitives + layout
  generated/            Generated code (Prisma client)
  i18n/                 next-intl routing/request helpers
  proxy.ts              Clerk + next-intl middleware boundary
```

**Status:** Active
**Last Updated:** 2026-06-20
