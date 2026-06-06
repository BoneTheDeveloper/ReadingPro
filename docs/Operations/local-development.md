# Local Development

## Prerequisites

- Node `24.x`
- pnpm `11.3.0`
- Local `.env` based on `.env.example`
- Clerk development keys
- Neon development database URL

## Setup

```bash
pnpm install
pnpm db:generate
pnpm db:migrate:dev
pnpm dev
```

## Common Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Start Next.js dev server with Turbopack. |
| `pnpm build` | Generate Prisma client and build Next.js. |
| `pnpm run typecheck` | TypeScript check. |
| `pnpm run lint` | ESLint. |
| `pnpm run test` | Vitest. |
| `pnpm e2e` | Playwright tests. |
| `pnpm db:studio` | Prisma Studio. |

## Local Storage

Development uploads write to `.local-blob-storage/`. The local read endpoint is `/api/local-blob/[pathname]` and is disabled outside development.

## Performance Mode

Use `pnpm dev:performance` to enable performance fixture routes and query metrics for dictionary/translation benchmark work.
