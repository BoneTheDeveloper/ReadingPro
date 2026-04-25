---
title: "Phase 02: Database Schema Design"
description: "Design and implement Prisma schema for passages, questions, flashcards, and progress tracking with SM-2 algorithm"
status: pending
priority: P1
effort: 4h
branch: main
tags: [prisma, database, sqlite, schema]
created: 2026-04-20
---

# Phase 02: Database Schema Design

**Status:** pending
**Owner:** unassigned
**Dependencies:** Phase 01

---

## Overview

Design complete Prisma schema for the MVP including content storage, flashcard questions, and SM-2 spaced repetition tracking.

---

## Requirements

### Functional
- Store user-uploaded passages (text/PDF content)
- Track CEFR level detection results
- Store generated questions with source citations
- Implement SM-2 algorithm for spaced repetition
- Track user progress and study sessions

### Non-Functional
- Type-safe database access
- Efficient queries for due cards
- Proper indexing for performance
- Migration-safe schema evolution

---

## Architecture

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     User        │       │    Passage      │       │  StudySession   │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │──┐    │ id (PK)         │
│ createdAt       │  │    │ userId (FK)     │  │    │ userId (FK)     │
│ email           │  │    │ title           │  │    │ startedAt       │
│ name            │  │    │ content         │  │    │ completedAt     │
│ targetLevel     │  └────│ originalLevel   │  └────│ cardsReviewed   │
└─────────────────┘       │ simplifiedLevel │       │ accuracy        │
                          │ wordCount       │       └─────────────────┘
                          │ createdAt       │
                          └─────────────────┘
                                   │
                                   │
                          ┌─────────────────┐       ┌─────────────────┐
                          │    Question     │       │ CardReview      │
                          ├─────────────────┤       ├─────────────────┤
                          │ id (PK)         │       │ id (PK)         │
                          │ passageId (FK)  │───────│ questionId (FK) │
                          │ questionText    │       │ userId (FK)     │
                          │ options (JSON)  │       │ qualityRating   │
                          │ correctAnswer   │       │ easeFactor      │
                          │ sourceText      │       │ intervalDays    │
                          │ sourceLine      │       │ repetitions     │
                          │ explanation     │       │ nextReviewDate  │
                          │ questionType    │       │ reviewedAt      │
                          └─────────────────┘       └─────────────────┘
```

---

## Related Code Files

### Files to Create
- `prisma/schema.prisma` - Complete database schema
- `prisma/migrations/xxxxx_init_schema/migration.sql` - Initial migration

### Files to Modify
- `src/lib/db.ts` - Prisma client singleton
- `.env.local` - Database URL verification

---

## Implementation Steps

### 1. Design Complete Prisma Schema

**File:** `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ============================================
// USER MODEL
// ============================================
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String?
  targetLevel  CEFRLevel @default(B2) // User's target reading level
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  passages      Passage[]
  studySessions StudySession[]
  cardReviews   CardReview[]

  @@map("users")
}

// ============================================
// PASSAGE MODEL
// ============================================
model Passage {
  id               String   @id @default(cuid())
  userId           String
  title            String
  content          String   // Original content
  simplifiedContent String? // AI-simplified content
  originalLevel    CEFRLevel? // AI-detected level
  simplifiedLevel  CEFRLevel? // Target simplification level
  wordCount        Int
  sourceType       SourceType
  fileUrl          String? // For uploaded files
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // Relations
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  questions Question[]

  @@index([userId])
  @@index([createdAt])
  @@map("passages")
}

// ============================================
// QUESTION MODEL (Flashcards)
// ============================================
model Question {
  id             String   @id @default(cuid())
  passageId      String
  questionText   String
  options        Json     // Array of {id, text}
  correctOption  String   // The correct option ID (A, B, C, D)
  sourceText     String   // Quote from passage for citation
  sourceLine     Int      // Line number for citation
  explanation    String   // Explanation of correct answer
  questionType   QuestionType @default(MULTIPLE_CHOICE)
  difficulty     Int      @default(3) // 1-5 scale
  createdAt      DateTime @default(now())

  // Relations
  passage  Passage      @relation(fields: [passageId], references: [id], onDelete: Cascade)
  reviews  CardReview[]

  @@index([passageId])
  @@map("questions")
}

// ============================================
// CARD REVIEW MODEL (SM-2 Tracking)
// ============================================
model CardReview {
  id             String    @id @default(cuid())
  questionId     String
  userId         String

  // SM-2 Algorithm Fields
  qualityRating  Int       // 0-5 scale (0=blackout, 5=perfect)
  easeFactor     Float     @default(2.5) // E-Factor (min 1.3)
  intervalDays   Int       @default(1) // Days until next review
  repetitions    Int       @default(0) // Successful repetitions

  // Scheduling
  nextReviewDate DateTime  @default(now()) // When this card is due
  reviewedAt     DateTime  @default(now())

  // Relations
  question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([questionId, userId]) // One review state per user-card
  @@index([userId, nextReviewDate]) // For querying due cards
  @@map("card_reviews")
}

// ============================================
// STUDY SESSION MODEL
// ============================================
model StudySession {
  id            String   @id @default(cuid())
  userId        String
  passageId     String?

  startedAt     DateTime @default(now())
  completedAt   DateTime?

  // Session Stats
  cardsReviewed Int      @default(0)
  newCards      Int      @default(0)
  correctCount  Int      @default(0)
  incorrectCount Int     @default(0)
  accuracyRate  Float?   // Calculated on completion

  // Relations
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, startedAt])
  @@map("study_sessions")
}

// ============================================
// ENUMS
// ============================================
enum CEFRLevel {
  A1    // Beginner
  A2    // Elementary
  B1    // Intermediate
  B2    // Upper Intermediate
  C1    // Advanced
  C2    // Mastery
}

enum SourceType {
  TEXT
  PDF
  YOUTUBE // Reserved for Phase 2
}

enum QuestionType {
  MULTIPLE_CHOICE
  TRUE_FALSE
  FILL_BLANK // Reserved for Phase 2
}
```

**Key Design Decisions:**
1. **SM-2 Fields in CardReview**: Eases scheduling calculations with indexes
2. **JSON for options**: Flexible for different question types
3. **Unique constraint on (questionId, userId)**: Each user has independent review state
4. **Composite index on (userId, nextReviewDate)**: Optimizes "due cards" query

### 2. Create Initial Migration

```bash
npx prisma migrate dev --name init_schema
```

**Verification:** Migration file created and `dev.db` generated

### 3. Setup Prisma Client Singleton

**File:** `src/lib/db.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Type utilities
export type PassageWithQuestions = Prisma.PassageGetPayload<{
  include: { questions: true };
}>;

export type QuestionWithReviews = Prisma.QuestionGetPayload<{
  include: { reviews: true };
}>;

export type CardReviewWithQuestion = Prisma.CardReviewGetPayload<{
  include: { question: true };
}>;
```

**Verification:** Import works without errors: `import { db } from '@/lib/db'`

### 4. Create Database Utilities

**File:** `src/lib/db-utils.ts`

```typescript
import { db } from './db';
import { CEFRLevel } from '@prisma/client';

/**
 * Get cards due for review for a user
 */
export async function getDueCards(userId: string) {
  return db.cardReview.findMany({
    where: {
      userId,
      nextReviewDate: { lte: new Date() },
    },
    include: {
      question: {
        include: {
          passage: true,
        },
      },
    },
    orderBy: {
      nextReviewDate: 'asc',
    },
    limit: 20, // Reasonable batch size
  });
}

/**
 * Get new cards for a passage (never reviewed)
 */
export async function getNewCards(userId: string, passageId: string) {
  return db.question.findMany({
    where: {
      passageId,
      reviews: {
        none: { userId },
      },
    },
    take: 5, // Limit new cards per session
  });
}

/**
 * Calculate SM-2 interval based on performance
 * Based on SuperMemo 2 algorithm
 */
export function calculateSM2Interval(
  previousEaseFactor: number,
  previousInterval: number,
  repetitions: number,
  qualityRating: number
): {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
} {
  let newEaseFactor = previousEaseFactor;
  let newRepetitions = repetitions;
  let newInterval = previousInterval;

  // Quality rating < 3 means failed recall - reset
  if (qualityRating < 3) {
    newRepetitions = 0;
    newInterval = 1;
  } else {
    newRepetitions += 1;

    // Calculate new ease factor
    newEaseFactor = Math.max(
      1.3,
      previousEaseFactor + (0.1 - (5 - qualityRating) * (0.08 + (5 - qualityRating) * 0.02))
    );

    // Calculate interval based on repetition number
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(previousInterval * newEaseFactor);
    }
  }

  return {
    easeFactor: Number(newEaseFactor.toFixed(2)),
    intervalDays: newInterval,
    repetitions: newRepetitions,
  };
}

/**
 * Update card review after user answers
 */
export async function updateCardReview(
  cardReviewId: string,
  qualityRating: number
) {
  const existing = await db.cardReview.findUniqueOrThrow({
    where: { id: cardReviewId },
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

/**
 * Get user progress statistics
 */
export async function getUserProgress(userId: string) {
  const [totalCards, matureCards, dueCards, todayReviews] = await Promise.all([
    db.cardReview.count({ where: { userId } }),
    db.cardReview.count({
      where: { userId, intervalDays: { gte: 21 } }, // Mature = 21+ days
    }),
    db.cardReview.count({
      where: { userId, nextReviewDate: { lte: new Date() } },
    }),
    db.cardReview.count({
      where: {
        userId,
        reviewedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  return {
    totalCards,
    matureCards,
    dueCards,
    todayReviews,
  };
}

/**
 * CEFR level to color mapping for UI
 */
export function getCEFRColor(level: CEFRLevel): string {
  const colors = {
    A1: 'bg-green-100 text-green-700',
    A2: 'bg-lime-100 text-lime-700',
    B1: 'bg-yellow-100 text-yellow-700',
    B2: 'bg-orange-100 text-orange-700',
    C1: 'bg-pink-100 text-pink-700',
    C2: 'bg-purple-100 text-purple-700',
  };
  return colors[level];
}

/**
 * CEFR level display names
 */
export function getCEFRLabel(level: CEFRLevel): string {
  const labels = {
    A1: 'Beginner',
    A2: 'Elementary',
    B1: 'Intermediate',
    B2: 'Upper Intermediate',
    C1: 'Advanced',
    C2: 'Mastery',
  };
  return labels[level];
}
```

**Verification:** Functions are type-safe and handle edge cases

### 5. Create Seed Script (Optional)

**File:** `prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      targetLevel: 'B2',
    },
  });

  console.log({ user });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

Add to `package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

Run: `npx prisma db seed`

---

## Todo List

- [ ] Design complete Prisma schema
- [ ] Create and run initial migration
- [ ] Setup Prisma client singleton
- [ ] Create database utility functions
- [ ] Implement SM-2 interval calculation
- [ ] Add due cards query optimization
- [ ] Create seed script for demo data
- [ ] Test all database queries

---

## Success Criteria

1. ✅ Migration runs successfully with `npx prisma migrate dev`
2. ✅ Prisma Client generates with correct types
3. ✅ SM-2 calculation produces expected intervals
4. ✅ `getDueCards()` query uses index (check with `EXPLAIN`)
5. ✅ All utility functions are type-safe

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| SM-2 calculation bugs | High | Unit test with known SuperMemo values |
| Missing indexes | Medium | Verify query plans with large datasets |
| Migration conflicts | Low | Use descriptive migration names, backup before migrations |

---

## Next Steps

After completion:
- Proceed to [Phase 03: Upload Handling](phase-03-upload-handling.md)
- Database ready for content storage

---

## Context Links

- [SM-2 Algorithm Paper](http://www.supermemo.com/en/archives1990-2015/english/ol/sm2)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Research: Flashcard Systems](../reports/researcher-flashcard-educational-systems-2024.md)
