# Codebase Summary

## Tech Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Prisma ORM 7, PostgreSQL, Better Auth, Zod 4, Vercel AI SDK, Sentry, Pino.

## Source Layout

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # HTTP routes
│   └── [locale]/             # UI routes
│
├── features/                 # Vertical slices
│   └── <feature>/
│       ├── actions.ts        # Server Actions
│       ├── db/              # Repositories
│       ├── services/         # Business logic (Server)
│       ├── schemas/         # Zod schemas
│       ├── errors/          # Feature errors
│       ├── hooks/           # React hooks
│       └── ui/              # Components
│
├── components/              # Shared components
│
├── lib/
│   ├── errors/             # Domain errors
│   ├── http/              # HTTP handling
│   ├── auth/              # Auth utilities
│   ├── prisma.ts          # Prisma client
│   └── logger.ts          # Pino logger
│
└── services/              # Cross-cutting integrations
```

## Features

| Feature | Responsibility |
|---------|----------------|
| dictionary | Lookup / search / suggest |
| vocabulary | Save & manage vocabulary |
| reading | Reading view + inline translation |
| studio-panel | AI chat + questions |
| upload | File upload → text extraction |
| passage | Passage persistence |
| ai-chat | AI chat service |
| users | User sync |

## Key Patterns

**Error Architecture:** Domain errors in `lib/errors/`, feature errors extend base. Routes use `withRoute()` + `toHttp()`.

**Schema Architecture:** Data schemas in `features/`, response contracts via `makeApiResponseSchema()`. Clients validate with `safeParse()`.

**Logging:** Pino in `lib/logger.ts`. Request context via `createModuleLogger()`.

## Entry Points

| Type | Location |
|------|----------|
| Frontend | `src/app/[locale]/` |
| Server Actions | `src/features/<f>/actions.ts` |
| API Routes | `src/app/api/**/route.ts` |
