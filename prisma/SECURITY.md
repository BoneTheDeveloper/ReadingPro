# Prisma & Supabase — Security Model

## Key Fact

Prisma connects via a dedicated `prisma` database user with `bypassrls`, using `@prisma/adapter-pg` (Prisma 7 requires explicit driver adapters).
RLS policies exist as a safety net for direct DB access but do not apply to Prisma queries.

## Connection Setup

| Purpose | Env Var | Port | Description |
|---------|---------|------|-------------|
| App queries | `DATABASE_URL` | 6543 | Pooled via Supavisor (`?pgbouncer=true`) |
| Migrations | `DIRECT_URL` | 5432 | Direct connection, configured in `prisma.config.ts` |

Prisma 7 removed the built-in PostgreSQL driver. `@prisma/adapter-pg` is mandatory — no standalone `PrismaClient()` possible.

Migration and reset procedures are documented in
[`prisma/MIGRATIONS.md`](./MIGRATIONS.md). Review that runbook before changing
or resetting a database.

## RLS Ownership

The canonical RLS SQL lives at [`prisma/rls/enable_rls.sql`](./rls/enable_rls.sql).
A byte-identical copy is placed in the corresponding Prisma migration
(`prisma/migrations/00000001_enable_rls/migration.sql`).
See [`prisma/rls/README.md`](./rls/README.md) for the maintenance workflow.

## Security Model

| Layer | Mechanism | Protects |
|-------|-----------|----------|
| Primary | Explicit `where: { userId }` on all queries | Every read/write scoped to authenticated user |
| Required | `getAuthenticatedUser()` before any DB call | Auth check must precede all DB operations |
| Secondary | Supabase RLS policies | Direct DB access via non-Prisma clients |

## Rules

1. **Always include `userId` in `where` clauses** for Passage, CardReview, StudySession queries
2. **Never skip `getAuthenticatedUser()`** — userId must come from auth, never from request body
3. **Verify ownership before update/delete** — fetch with userId, then mutate by id
4. **`db` is the single Prisma client** — import from `@/lib/db/client`
5. **Prisma is server-side only** — never expose to client components
6. **RLS stays enabled** — defense-in-depth for direct DB access
