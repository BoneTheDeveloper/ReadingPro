## Security Model

| Layer | Mechanism | Protects |
|-------|-----------|----------|
| Primary | Explicit `where: { userId }` on all queries | Every read/write scoped to authenticated user |
| Required | `getUserId()` / `getPageUserId()` before any DB call | Auth check must precede all DB operations |
| Infrastructure | Runtime receives pooled credentials only | Limits application credential exposure |
| Migration gate | Direct credentials only in trusted migration contexts | Prevents runtime schema/admin access |

## Rules

1. **Use `getUserId()` as the gate in API routes** — JWT-only, no Backend API call. `userId` must come from auth, never from the request body. Use `getPageUserId()` in Server Components. Use `getCurrentUser()` only when the full profile (email/name/avatar) is required.
2. **Verify ownership before update/delete** — fetch with userId, then mutate by id
3. **FK-creating writes go through the shared create modules** (`passage-create`, `translation-queries`, `vocabulary-queries`, `vocabulary-set-queries`, `study-session-queries`) which wrap the `userId`-FK write in `withUserProfile(userId, write)` (lazy ensure: optimistic write, ensure + retry only on a missing `UserProfile` FK). Do not `db.*.create` a `userId`-FK row directly in a route handler.
4. **Prisma is server-side only** — never expose to client components
5. **No browser database access** — Prisma and database credentials remain server-only
