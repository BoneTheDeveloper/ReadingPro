# Prisma & Supabase RLS — Security Model

## Key Fact

Prisma connects via the **service role** (`DB_USER`/`DB_PASSWORD`), which **bypasses Supabase RLS entirely**.

RLS policies in `supabase/migrations/enable_rls.sql` do **not** protect Prisma queries.

## Security Model

| Layer | Mechanism | Protects |
|-------|-----------|----------|
| Primary | `withUserContext(userId)` extension | Auto-scopes Passage, CardReview, StudySession |
| Required | `getAuthenticatedUser()` before any DB call | Auth check must happen before scoped client is created |
| Secondary | Supabase RLS policies | Direct Supabase client queries (if any) |

## User Context Extension

`src/lib/db/user-scoped-client.ts` provides `withUserContext(userId)` which returns a Prisma client that **automatically scopes** all queries on user-owned models:

- **Passage** — `userId` auto-injected on create, auto-filtered on read/write
- **CardReview** — `userId` auto-filtered on all operations
- **StudySession** — `userId` auto-injected on create, auto-filtered on read/write

```typescript
const user = await getAuthenticatedUser();
const userDb = withUserContext(user.id);
const passage = await userDb.passage.findUnique({ where: { id: passageId } }); // auto-scoped
```

**Not scoped** (intentionally):
- `UserProfile` — managed by auth infrastructure (`sync-user.ts`, `auth-utils.ts`)
- `Question` — protected by passage ownership (always accessed via a scoped passage)

## Rules

1. **Use `withUserContext()` for all app code** — Never import `db` directly in API routes, server actions, or page components
2. **Never skip `getAuthenticatedUser()`** — The scoped client requires a valid userId from auth
3. **`db` is for auth infrastructure only** — `sync-user.ts` and `auth-utils.ts` may use `db` directly for profile management
4. **Prisma is server-side only** — Never expose Prisma client to client components
5. **RLS stays enabled** — Defense-in-depth for direct Supabase client usage
