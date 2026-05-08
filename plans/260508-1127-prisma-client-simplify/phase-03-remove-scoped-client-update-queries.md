---
title: "Phase 3: Remove user-scoped-client + update query files"
phase: 3
status: pending
effort: 45m
---

## Overview

Delete `user-scoped-client.ts`. Rewrite all 3 query files to accept `PrismaClient` (or `userId` string) instead of `ScopedClient`. Add explicit `userId` to all `where` clauses.

## Files

| Action | File |
|--------|------|
| DELETE | `src/lib/db/user-scoped-client.ts` |
| MODIFY | `src/lib/db/passage-queries.ts` |
| MODIFY | `src/lib/db/card-review-queries.ts` |
| MODIFY | `src/lib/db/study-session-queries.ts` |

## Implementation

### Delete `src/lib/db/user-scoped-client.ts`

### `src/lib/db/passage-queries.ts`

Changes:
- Remove `import { withUserContext }` and `ScopedClient` type
- Import `PrismaClient` from `@prisma/client` for type hints
- Accept `db: PrismaClient` + `userId: string` as params
- Add `where: { userId }` to `findMany`, `findUnique`
- `createPassage` already passes `userId` in data — no where change needed
- `createQuestion` doesn't need userId (Question model has no userId field)
- `getNewCards` — remove `withUserContext(userId)`, use `db.question.findMany` directly with explicit filter

```typescript
import type { PrismaClient } from '@prisma/client';
import type { CEFRLevel } from '../shared/cefr-utils';
import { db } from './client';

export async function getUserPassages(userId: string) {
  return db.passage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPassageWithQuestions(passageId: string, userId: string) {
  return db.passage.findUnique({
    where: { id: passageId, userId },
    include: { questions: true },
  });
}

export async function createPassage(
  userId: string,
  data: {
    title: string;
    content: string;
    simplifiedContent?: string;
    originalLevel?: CEFRLevel;
    simplifiedLevel?: CEFRLevel;
    wordCount: number;
    sourceType: 'TEXT' | 'PDF';
    fileUrl?: string;
  }
) {
  return db.passage.create({ data: { userId, ...data } });
}

export async function createQuestion(
  data: {
    passageId: string;
    questionText: string;
    options: { id: string; text: string }[];
    correctOption: string;
    sourceText: string;
    sourceLine: number;
    explanation: string;
  }
) {
  return db.question.create({ data });
}

export async function getNewCards(userId: string, passageId: string) {
  return db.question.findMany({
    where: {
      passageId,
      reviews: {
        none: { userId },
      },
    },
    take: 5,
  });
}
```

### `src/lib/db/card-review-queries.ts`

Changes:
- Remove `import { withUserContext }` and `ScopedClient` type
- Import `db` from `./client`
- All functions take `userId: string` instead of `client: ScopedClient`
- Add `where: { userId }` to all `findMany`, `count`, `findUniqueOrThrow`, `update`
- `createCardReview` already passes `userId` in data
- `updateCardReview` — add ownership check: fetch with userId, then update by id

```typescript
import { db } from './client';
export { getCEFRColor, getCEFRLabel } from '../shared/cefr-utils';

// calculateSM2Interval stays unchanged

export async function getDueCards(userId: string) {
  return db.cardReview.findMany({
    where: {
      userId,
      nextReviewDate: { lte: new Date() },
    },
    include: {
      question: { include: { passage: true } },
    },
    orderBy: { nextReviewDate: 'asc' },
    take: 20,
  });
}

export async function updateCardReview(
  userId: string,
  cardReviewId: string,
  qualityRating: number
) {
  // Verify ownership
  const existing = await db.cardReview.findUniqueOrThrow({
    where: { id: cardReviewId, userId },
  });

  const sm2 = calculateSM2Interval(
    existing.easeFactor,
    existing.intervalDays,
    existing.repetitions,
    qualityRating
  );

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + sm2.intervalDays);

  return db.cardReview.update({
    where: { id: cardReviewId },
    data: {
      qualityRating,
      easeFactor: sm2.easeFactor,
      intervalDays: sm2.intervalDays,
      repetitions: sm2.repetitions,
      nextReviewDate,
      reviewedAt: new Date(),
    },
  });
}

export async function createCardReview(
  userId: string,
  questionId: string
) {
  return db.cardReview.create({
    data: {
      userId,
      questionId,
      qualityRating: 0,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
    },
  });
}

export async function getUserProgress(userId: string) {
  const [totalCards, matureCards, dueCards, todayReviews] = await Promise.all([
    db.cardReview.count({ where: { userId } }),
    db.cardReview.count({ where: { userId, intervalDays: { gte: 21 } } }),
    db.cardReview.count({ where: { userId, nextReviewDate: { lte: new Date() } } }),
    db.cardReview.count({
      where: {
        userId,
        reviewedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  return { totalCards, matureCards, dueCards, todayReviews };
}
```

### `src/lib/db/study-session-queries.ts`

Changes:
- Remove `import { withUserContext }` and `ScopedClient` type
- Import `db` from `./client`
- Functions take `userId: string` instead of `client: ScopedClient`
- `updateStudySession` — verify ownership with userId

```typescript
import { db } from './client';

export async function createStudySession(userId: string, passageId?: string) {
  return db.studySession.create({
    data: { userId, passageId },
  });
}

export async function updateStudySession(
  userId: string,
  sessionId: string,
  data: {
    completedAt?: Date;
    cardsReviewed?: number;
    newCards?: number;
    correctCount?: number;
    incorrectCount?: number;
    accuracyRate?: number;
  }
) {
  // Verify ownership
  await db.studySession.findUniqueOrThrow({
    where: { id: sessionId, userId },
  });

  return db.studySession.update({
    where: { id: sessionId },
    data,
  });
}
```

## Success Criteria

- [ ] `user-scoped-client.ts` deleted
- [ ] No file imports `withUserContext` or references `ScopedClient`
- [ ] All query functions use `db` directly with explicit `userId`
- [ ] Ownership verification before update/delete operations

## Rollback

- Restore `user-scoped-client.ts` from git
- Restore query files from git
