# Code Review: Prisma Client Extension — User Context Injection

### Scope
- Files: `src/lib/db/user-scoped-client.ts` (new), `src/lib/db/client.ts`, `prisma/SECURITY.md`, 8 app files
- LOC: ~50 (extension) + scattered call sites
- Focus: Security correctness of user-scoping extension pattern

### Overall Assessment
The extension pattern is architecturally sound and correctly scopes the three user-owned models (Passage, CardReview, StudySession). However, there are two security-critical bypass vectors via `src/lib/db/utils.ts` and a design concern with the `update`/`delete` operations on scoped models.

---

### Critical Issues

#### C1. `db/utils.ts` — entire utility module bypasses the scoped client (SECURITY BYPASS)

`src/lib/db/utils.ts` imports `db` directly and performs **12 raw DB calls** across Passage, CardReview, Question, and StudySession — none of them scoped through `withUserContext()`.

Consumers:
- `src/app/api/cards/review/route.ts` — calls `updateCardReview()` which does unscoped `findUniqueOrThrow` + `update` on CardReview
- `src/app/api/cards/due/route.ts` — calls `getDueCards()` (manually passes userId, OK)
- `src/app/api/progress/stats/route.ts` — calls `getUserProgress()` (manually passes userId, OK)

**Bypass vector in `updateCardReview`** (line 78-107 of utils.ts): This function takes a `cardReviewId` and performs:
```typescript
const existing = await db.cardReview.findUniqueOrThrow({ where: { id: cardReviewId } });
return db.cardReview.update({ where: { id: cardReviewId }, data: { ... } });
```
There is **zero user ownership check**. The caller in `cards/review/route.ts` does `userDb.cardReview.findUniqueOrThrow` to verify ownership first, then calls `updateCardReview` — but `updateCardReview` runs its own unscoped query. This is fragile (two-step check, second step unprotected) and any future caller of `updateCardReview` will skip auth entirely.

Similarly, `getPassageWithQuestions` (line 175), `updateStudySession` (line 195), `createPassage` (line 136), `createCardReview` (line 162) all use raw `db`.

**Fix**: Either (a) refactor `db/utils.ts` functions to accept the scoped client as a parameter, or (b) convert them to methods that go through `withUserContext`. At minimum, `updateCardReview` and `updateStudySession` must verify userId ownership.

#### C2. `update`/`delete` with `where: { id }` is NOT scoped — active security vulnerability (CONFIRMED)

The extension's WRITE_OPS path does:
```typescript
args.where = { ...args.where, userId };
```

**This is confirmed broken.** Prisma's `update`/`delete`/`findUnique` require `where` to match a unique constraint exactly. Schema analysis:

| Model | PK definition | Compound unique on `[id, userId]`? |
|-------|--------------|--------------------------------------|
| Passage | `id @id @default(cuid())` | **No** |
| StudySession | `id @id @default(cuid())` | **No** |
| CardReview | `id @id @default(cuid())` | **No** (compound is `[questionId, userId]`) |

Since none of the scoped models define `@@unique([id, userId])`, Prisma **cannot** accept `{ where: { id: someId, userId: someUserId } }` on `update`/`delete` operations. The `args` are typed as `any` in `$allOperations`, so TypeScript provides no compile-time safety net. Prisma 7.8.0 either rejects the compound where at runtime (causing unhandled errors) or silently ignores the extra field — both outcomes defeat the security guarantee.

**Affected call sites** (any `update`/`delete` via scoped client is unscoped in practice):
- `study-simplify-action.ts` line 60: `userDb.passage.update({ where: { id: passageId }, ... })`
- `study-session/route.ts` line 46: `userDb.studySession.update({ where: { id: sessionId }, ... })`
- Any future `userDb.passage.delete()` / `userDb.studySession.delete()` / `userDb.cardReview.delete()` / `userDb.cardReview.update()`

**Note**: `updateMany`/`deleteMany` are NOT affected — they accept arbitrary `where` clauses.

**Fix (recommended)**: Replace the WRITE_OPS path for `update`/`delete` with a post-query ownership check pattern (same approach already used for `findUnique`):

```typescript
const SINGLE_RECORD_WRITE_OPS = new Set(['update', 'delete']);

if (SINGLE_RECORD_WRITE_OPS.has(operation)) {
  const record = await query({ ...args, operation: 'findFirst', args: { where: args.where } });
  // Actually, use the original query to fetch, then verify:
  const result = await query(args);
  if (result && result.userId !== userId) {
    throw new Prisma.PrismaClientKnownRequestError(
      'Record not found',
      { code: 'P2025', clientVersion: Prisma.prismaVersion.client }
    );
  }
  return result;
}
```

Or more reliably, fetch-first-then-operate:
```typescript
if (SINGLE_RECORD_WRITE_OPS.has(operation)) {
  // Verify ownership before the write
  const existing = await db[args.model].findFirst({ where: { id: args.where.id, userId } });
  if (!existing) throw new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025', ... });
  return query(args); // args.where untouched — Prisma accepts original { id }
}
```

**Schema-level fix (alternative)**: Add `@@unique([id, userId])` to Passage, StudySession, and CardReview in `schema.prisma`. This makes the compound where valid for Prisma but adds a migration and storage overhead.

---

### High Priority

#### H1. `$transaction` does not scope unregistered models

In `study-generate-questions-action.ts` line 63-78:
```typescript
await userDb.$transaction([
  userDb.question.deleteMany({ where: { passageId } }),
  userDb.question.createMany({ data: questions.map(...) }),
]);
```

`Question` is **not** registered in the extension's query scope (only `passage`, `cardReview`, `studySession` are). These operations go through the raw `db`. The passage ownership was verified above via `findUnique`, but the `passageId` in the transaction is taken from user input and could theoretically reference any passage if the prior check is somehow bypassed (e.g., race condition between check and transaction).

**Risk**: Medium-low. The `findUnique` check above does verify ownership. But this is defense-in-depth gap — the transaction itself is unscoped.

**Fix**: This is acceptable given the prior ownership check, but document explicitly in SECURITY.md that `Question` operations inside transactions are protected by prior passage ownership verification, not by the extension.

#### H2. `create` double-injection of `userId` is wasteful but not harmful

In `analyze.ts` line 82-105, `study-upload-action.ts` line 60-69, and `study-session/route.ts` line 16-22:
```typescript
userDb.passage.create({
  data: { userId: user.id, title, ... }
})
```

The extension's `create` handler does `args.data = { ...args.data, userId }`, which means userId is set twice — once explicitly by the caller, once by the extension. The spread order means the extension's value wins (since it wraps `args.data`). This is not a bug but is confusing.

**Fix**: Remove the explicit `userId: user.id` from call sites. Let the extension be the single source of truth. This makes the security guarantee clearer — if you use `withUserContext`, you cannot accidentally inject a different userId.

#### H3. `db/utils.ts` `getNewCards` queries Question model without passage ownership check

Line 25-35:
```typescript
export async function getNewCards(userId: string, passageId: string) {
  return db.question.findMany({
    where: { passageId, reviews: { none: { userId } } },
    take: 5,
  });
}
```

This does not verify that `passageId` belongs to the calling user. A user could pass any passageId and get questions from another user's passage.

**Fix**: Join through passage to verify ownership: `where: { passage: { userId, id: passageId }, reviews: { none: { userId } } }`.

---

### Medium Priority

#### M1. `findUnique` post-check returns `null` instead of throwing for ownership violation on `findUnique`

When `findUnique` returns a record belonging to another user, the extension returns `null`. This is indistinguishable from "record does not exist." This is actually correct behavior for security (don't leak existence info), but worth documenting explicitly.

#### M2. Extension does not cover `upsert` operation

If any code calls `userDb.passage.upsert(...)`, it falls through to the default `return query(args)` path — completely unscoped. No current call sites use `upsert` on scoped models, but this is a latent gap.

#### M3. Type safety of `$allOperations` args

The `args` and `query` parameters are typed as `any`. This is a Prisma extension limitation, but it means compile-time checks won't catch misuse. Consider adding runtime validation of `userId` shape in `withUserContext`.

---

### Low Priority

#### L1. SECURITY.md says `db` is for auth infrastructure only — but `db/utils.ts` uses it for app logic

The documentation states Rule 3: "db is for auth infrastructure only." Yet `db/utils.ts` is clearly app-level code using raw `db`. Either update the docs or fix the code.

#### L2. `calculateSM2Interval` is a pure function in `db/utils.ts`

The SM2 calculation function (line 37-76) has no DB dependency. It could live in a separate utility module to reduce the surface area of the `db/utils.ts` file.

---

### Positive Observations
- Extension factory pattern is clean and composable — `withUserContext` returns a properly typed extended client
- `findUnique`/`findUniqueOrThrow` post-check is the correct workaround for Prisma's limitation on compound where in unique lookups
- `SECURITY.md` is well-structured with clear rules and the "not scoped (intentionally)" section is excellent defense-in-depth documentation
- Auth check always precedes scoped client creation — no path skips `getAuthenticatedUser()`
- Error handling in the extension is correct: `findUniqueOrThrow` throws `P2025` (Record not found) on ownership mismatch, matching Prisma's native error contract

---

### Recommended Actions

1. **[CRITICAL]** Fix `update`/`delete` scoping in `user-scoped-client.ts` — the WRITE_OPS compound-where pattern is confirmed broken for single-record operations. Prisma rejects compound where when `id` alone is the unique constraint. Switch to post-query ownership verification (like the `findUnique` path already does) or add `@@unique([id, userId])` to the schema.
2. **[CRITICAL]** Audit and refactor `src/lib/db/utils.ts` — functions that touch Passage, CardReview, StudySession must use the scoped client or accept userId and verify ownership internally
3. **[HIGH]** Remove explicit `userId` from `create` call sites — let the extension be the single injection point
4. **[HIGH]** Add passage ownership check in `getNewCards`
5. **[MEDIUM]** Document `Question` transaction scoping gap in SECURITY.md
6. **[MEDIUM]** Add `upsert` to the extension's WRITE_OPS set, or document it as unscoped

---

### Unresolved Questions
- **C2 runtime behavior**: Schema analysis confirms compound where is invalid for `update`/`delete`. Whether Prisma 7.8.0 throws an error or silently ignores the extra `userId` field needs runtime confirmation (affects user experience — 500 errors vs. silent auth bypass). Test with `userDb.passage.update({ where: { id: passageId }, data: { title: 'test' } })` against a record owned by a different user.
- Are there other callers of `updateCardReview` or `updateStudySession` beyond the routes I found, or planned future callers?
- Was `db/utils.ts` intentionally left unscoped as a transitional step, or is it a missed file?
