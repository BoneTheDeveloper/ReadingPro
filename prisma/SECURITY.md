## Security Model

| Layer | Mechanism | Protects |
|-------|-----------|----------|
| Primary | Explicit `where: { userId }` on all queries | Every read/write scoped to authenticated user |
| Required | `getAuthenticatedUser()` before any DB call | Auth check must precede all DB operations |
| Infrastructure | Runtime receives pooled credentials only | Limits application credential exposure |
| Migration gate | Direct credentials only in trusted migration contexts | Prevents runtime schema/admin access |

## Rules

1. **Always include `userId` in `where` clauses** for Passage, CardReview, StudySession queries
2. **Never skip `getAuthenticatedUser()`** — userId must come from auth, never from request body
3. **Verify ownership before update/delete** — fetch with userId, then mutate by id
4. **`db` is the single Prisma client** — import from `@/lib/db/client`
5. **Prisma is server-side only** — never expose to client components
6. **No browser database access** — Prisma and database credentials remain server-only
