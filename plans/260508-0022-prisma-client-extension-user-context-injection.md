# Plan: Prisma Client Extension for User Context Injection

## Context

Issue #29 audit found 4 files missing auth checks. Manual `userId` scoping in every query is error-prone (DRY problem). Prisma Client Extensions can auto-inject user context, making accidental data leaks structurally impossible.

## Approach

Create a `withUserContext(userId)` factory that returns an extended Prisma client. All queries on user-owned models (Passage, CardReview, StudySession) are automatically scoped to the authenticated user.

### Models Scoped
| Model | Field | Notes |
|-------|-------|-------|
| Passage | `userId` | Direct |
| CardReview | `userId` | Direct |
| StudySession | `userId` | Direct |
| Question | via passage | Protected by passage scoping (no direct userId field) |
| UserProfile | `id` | Excluded — managed by auth infrastructure |

### Operations Intercepted
- **findUnique / findUniqueOrThrow**: Execute, then verify `userId` on result. Mismatch → null / throw NotFoundError
- **findFirst / findMany / count / aggregate / groupBy**: Inject `where: { userId }`
- **create**: Inject `data: { userId }`
- **update / delete / updateMany / deleteMany**: Inject `where: { userId }`

### Why post-check for findUnique?
Prisma `findUnique` requires `where` to target a single unique field — can't add `userId` alongside `id`. Post-query check is the clean solution.

## Files

### Create
- `src/lib/db/user-scoped-client.ts` — Extension definition + `withUserContext(userId)` factory

### Modify
- `src/lib/db/client.ts` — Re-export `withUserContext`
- `src/app/actions/analyze.ts` — Use scoped client, remove manual userId from where/data
- `src/app/actions/study-upload-action.ts` — Use scoped client, remove manual userId
- `src/app/actions/study-simplify-action.ts` — Use scoped client, remove manual userId
- `src/app/actions/study-generate-questions-action.ts` — Use scoped client, remove manual userId
- `src/app/api/cards/review/route.ts` — Use scoped client, remove manual userId check
- `src/app/api/study-session/route.ts` — Use scoped client, remove manual userId
- `src/app/(dashboard)/reading/[id]/page.tsx` — Use scoped client, remove manual userId
- `src/app/(dashboard)/test/[id]/page.tsx` — Use scoped client, remove manual userId
- `prisma/SECURITY.md` — Update to document extension pattern

### NOT modified (auth infrastructure — uses `db` directly)
- `src/lib/auth/sync-user.ts`
- `src/lib/auth/auth-utils.ts`
- `src/lib/db/utils.ts` (already takes userId as parameter)

## Usage Pattern

Before:
```typescript
const user = await getAuthenticatedUser();
const passage = await db.passage.findUnique({ where: { id: passageId, userId: user.id } });
const session = await db.studySession.create({ data: { userId: user.id, passageId } });
```

After:
```typescript
const user = await getAuthenticatedUser();
const userDb = withUserContext(user.id);
const passage = await userDb.passage.findUnique({ where: { id: passageId } }); // auto-scoped
const session = await userDb.studySession.create({ data: { passageId } }); // auto-injects userId
```

## Verification
1. `npx tsc --noEmit` — compile check
2. Verify no app files import `db` directly (grep check)
3. Code review
