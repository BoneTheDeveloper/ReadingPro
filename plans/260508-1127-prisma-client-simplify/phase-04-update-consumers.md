---
title: "Phase 4: Update all consumers"
phase: 4
status: pending
effort: 45m
---

## Overview

Replace all `withUserContext(user.id)` calls with direct `db` usage. Pass `userId` explicitly to query functions.

## Files

| Action | File |
|--------|------|
| MODIFY | `src/app/api/study-session/route.ts` |
| MODIFY | `src/app/api/cards/due/route.ts` |
| MODIFY | `src/app/api/progress/stats/route.ts` |
| MODIFY | `src/app/api/cards/review/route.ts` |
| MODIFY | `src/app/actions/analyze.ts` |
| MODIFY | `src/app/actions/study-simplify-action.ts` |
| MODIFY | `src/app/actions/study-generate-questions-action.ts` |
| MODIFY | `src/app/actions/study-upload-action.ts` |
| MODIFY | `src/app/(dashboard)/test/[id]/page.tsx` |
| MODIFY | `src/app/(dashboard)/reading/[id]/page.tsx` |

## Pattern: Before -> After

```typescript
// BEFORE
import { withUserContext } from '@/lib/db/client';
const userDb = withUserContext(user.id);
await userDb.passage.findUnique({ where: { id: passageId } });

// AFTER
import { db } from '@/lib/db/client';
await db.passage.findUnique({ where: { id: passageId, userId: user.id } });
```

For query function calls:

```typescript
// BEFORE
const userDb = withUserContext(user.id);
const dueCards = await getDueCards(userDb);

// AFTER
const dueCards = await getDueCards(user.id);
```

## Per-File Changes

### 1. `src/app/api/study-session/route.ts`

- Replace `import { withUserContext }` with `import { db }`
- POST handler: `db.studySession.create({ data: { userId: user.id, passageId, startedAt: new Date() } })`
- PATCH handler: verify ownership then `db.studySession.update({ where: { id: sessionId }, data: {...} })`
  - Add ownership check: `await db.studySession.findUniqueOrThrow({ where: { id: sessionId, userId: user.id } })`

### 2. `src/app/api/cards/due/route.ts`

- Replace `import { withUserContext }` with `import { db }`
- `const dueCards = await getDueCards(user.id);`

### 3. `src/app/api/progress/stats/route.ts`

- Replace `import { withUserContext }` with `import { db }`
- `const stats = await getUserProgress(user.id);`

### 4. `src/app/api/cards/review/route.ts`

- Replace `import { withUserContext }` with `import { db }`
- Remove `userDb.cardReview.findUniqueOrThrow` (ownership check now inside `updateCardReview`)
- `const updatedReview = await updateCardReview(user.id, cardReviewId, qualityRating);`

### 5. `src/app/actions/analyze.ts`

- Replace `import { withUserContext }` with `import { db }`
- Remove `const userDb = withUserContext(user.id);`
- `db.passage.create({ data: { userId: user.id, ... } })` — already passes userId in data

### 6. `src/app/actions/study-simplify-action.ts`

- Replace `import { withUserContext }` with `import { db }`
- `db.passage.findUnique({ where: { id: passageId, userId: user.id } })`
- `db.passage.update({ where: { id: passageId, userId: user.id }, data: {...} })` — add userId to update where for safety

### 7. `src/app/actions/study-generate-questions-action.ts`

- Replace `import { withUserContext }` with `import { db }`
- `db.passage.findUnique({ where: { id: passageId, userId: user.id } })`
- Transaction: `db.$transaction([db.question.deleteMany({ where: { passageId } }), db.question.createMany({ data: ... })])`
  - Question model has no userId — deleteMany/createMany by passageId is fine (passage ownership already verified)

### 8. `src/app/actions/study-upload-action.ts`

- Replace `import { withUserContext }` with `import { db }`
- `db.passage.create({ data: { userId: user.id, ... } })` — already passes userId

### 9. `src/app/(dashboard)/test/[id]/page.tsx`

- Replace `import { withUserContext }` with `import { db }`
- `db.passage.findUnique({ where: { id: passageId, userId: user.id }, include: { questions: true } })`

### 10. `src/app/(dashboard)/reading/[id]/page.tsx`

- Replace `import { withUserContext }` with `import { db }`
- `db.passage.findUnique({ where: { id: passageId, userId: user.id }, include: { questions: true } })`

## Success Criteria

- [ ] Zero occurrences of `withUserContext` in src/
- [ ] All `db.*` reads include `userId` in `where` clause (where model has userId)
- [ ] All `db.*` updates/deletes verify ownership before mutation

## Rollback

- Restore all 10 files from git
