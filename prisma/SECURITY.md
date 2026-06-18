## Security Model

| Layer | Mechanism | Protects |
|-------|-----------|----------|
| Primary | Explicit `where: { userId }` on all queries | Every read/write scoped to authenticated user |
| Required | `getUserId()` / `getPageUserId()` before any DB call | Auth check must precede all DB operations |
| Infrastructure | Runtime receives pooled credentials only | Limits application credential exposure |
| Migration gate | Direct credentials only in trusted migration contexts | Prevents runtime schema/admin access |

## Rules

1. **Always include `userId` in `where` clauses** for Passage, CardReview, StudySession queries
2. **Use `getUserId()` as the gate in API routes** — JWT-only, no Backend API call. `userId` must come from auth, never from the request body. Use `getPageUserId()` in Server Components. Use `getCurrentUser()` only when the full profile (email/name/avatar) is required.
3. **Verify ownership before update/delete** — fetch with userId, then mutate by id
4. **FK-creating writes go through the 5 shared create modules** (`passage-create`, `translation-create`, `vocabulary-create`, `vocabulary-set-create`, `session-create`) which call `ensureUserProfile(userId)`. Do not `db.*.create` a `userId`-FK row directly in a route handler.
5. **`db` is the single Prisma client** — import from `@/lib/db/client`
6. **Prisma is server-side only** — never expose to client components
7. **No browser database access** — Prisma and database credentials remain server-only
