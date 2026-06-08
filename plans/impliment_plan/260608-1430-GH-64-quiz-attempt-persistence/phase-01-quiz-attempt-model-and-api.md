---
phase: 1
title: "QuizAttempt Model + API"
status: pending
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: QuizAttempt Model + API

## Overview

Add `QuizAttempt` Prisma model as the source of truth for quiz performance. Create DB query functions and API endpoints for creating and completing quiz attempts. QuizAttempt is separate from StudySession — it holds quiz-specific stats, not engagement data.

## Requirements

- Functional: `QuizAttempt` model with correctCount, incorrectCount, totalQuestions, accuracyRate
- Functional: `QuizAttempt` linked to StudySession via FK (one session can have many attempts)
- Functional: POST /api/quiz-attempt creates an attempt
- Functional: PATCH /api/quiz-attempt completes an attempt with counts and computed accuracy
- Non-functional: Migration is additive — no breaking changes to existing schema
- Non-functional: API follows same patterns as existing `/api/study-session`

## Architecture

```
QuizAttempt
  ├── id (UUID, PK)
  ├── studySessionId (FK → StudySession, CASCADE)
  ├── userId (FK → UserProfile, CASCADE)
  ├── passageId (FK → Passage, SET NULL)
  ├── correctCount (Int, default 0)
  ├── incorrectCount (Int, default 0)
  ├── totalQuestions (Int, default 0)
  ├── accuracyRate (Float?, computed on completion)
  ├── startedAt (DateTime, default now())
  ├── completedAt (DateTime?, nullable)
  ├── Index: [userId, startedAt]
  └── Table: quiz_attempts

API:
  POST /api/quiz-attempt
    Body: { studySessionId: string, passageId?: string }
    Response: { success: true, data: QuizAttemptDTO }

  PATCH /api/quiz-attempt
    Body: { attemptId: string, correctCount: number, incorrectCount: number, totalQuestions: number }
    Response: { success: true, data: QuizAttemptDTO }
    Computes: accuracyRate = (correctCount / totalQuestions) * 100
```

## Related Code Files

- Modify: `prisma/schema.prisma` — add QuizAttempt model + relations
- Create: `src/lib/db/quiz-attempt-queries.ts` — createQuizAttempt, completeQuizAttempt
- Create: `src/app/api/quiz-attempt/route.ts` — POST + PATCH handlers
- Modify: `src/lib/study/shared/study-response-schema.ts` — add quizAttemptSchema + DTO

## Implementation Steps

1. Add `QuizAttempt` model to `prisma/schema.prisma`:
   ```prisma
   model QuizAttempt {
     id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
     studySessionId  String    @db.Uuid
     userId          String
     passageId       String?   @db.Uuid

     correctCount    Int       @default(0)
     incorrectCount  Int       @default(0)
     totalQuestions  Int       @default(0)
     accuracyRate    Float?

     startedAt       DateTime  @default(now())
     completedAt     DateTime?

     studySession StudySession @relation(fields: [studySessionId], references: [id], onDelete: Cascade)
     user         UserProfile  @relation(fields: [userId], references: [id], onDelete: Cascade)
     passage      Passage?     @relation(fields: [passageId], references: [id], onDelete: SetNull)

     @@index([userId, startedAt])
     @@map("quiz_attempts")
   }
   ```
2. Add relation to `StudySession` model: `quizAttempts QuizAttempt[]`
3. Add relation to `UserProfile` model: `quizAttempts QuizAttempt[]`
4. Add relation to `Passage` model: `quizAttempts QuizAttempt[]`
5. Run `pnpm db:migrate:dev --name add-quiz-attempt-model`
6. Run `pnpm db:generate`

7. Create `src/lib/db/quiz-attempt-queries.ts`:
   ```ts
   export async function createQuizAttempt(
     studySessionId: string, userId: string, passageId?: string
   ) {
     // Validate session ownership
     // Validate passage if provided
     // Create attempt with startedAt
   }

   export async function completeQuizAttempt(
     attemptId: string, userId: string,
     data: { correctCount: number; incorrectCount: number; totalQuestions: number }
   ) {
     // Validate attempt ownership
     // Throw if already completed
     // Compute accuracyRate = (correctCount / totalQuestions) * 100
     // Round to 2 decimal places
     // Update with counts + accuracyRate + completedAt
   }
   ```

8. Add `quizAttemptSchema` and DTO to `study-response-schema.ts`:
   ```ts
   export const quizAttemptSchema = z.object({
     id: z.string(),
     studySessionId: z.string(),
     passageId: z.string().nullable(),
     correctCount: z.number(),
     incorrectCount: z.number(),
     totalQuestions: z.number(),
     accuracyRate: z.number().nullable(),
     startedAt: z.string(),
     completedAt: z.string().nullable(),
   }).strict();
   ```

9. Create `src/app/api/quiz-attempt/route.ts`:
   - POST: validate `{ studySessionId, passageId? }` → `createQuizAttempt` → return DTO
   - PATCH: validate `{ attemptId, correctCount, incorrectCount, totalQuestions }` → `completeQuizAttempt` → return DTO
   - Both require authenticated user via `getAuthenticatedUser()`
   - Follow error handling patterns from `study-session/route.ts`

10. Run `pnpm run typecheck`

## Success Criteria

- [ ] QuizAttempt model exists in Prisma schema with all fields and relations
- [ ] Migration runs successfully
- [ ] Prisma client generated with QuizAttempt type
- [ ] POST /api/quiz-attempt creates attempt and returns DTO
- [ ] PATCH /api/quiz-attempt completes attempt with computed accuracy
- [ ] Ownership validation on both endpoints
- [ ] Cannot complete an already-completed attempt
- [ ] Typecheck passes

## Risk Assessment

- **Risk:** Adding relations to UserProfile/Passage could conflict with existing relations. **Mitigation:** Each model can have multiple `@relation` blocks with unique field names.
- **Risk:** Migration on Neon might need waking. **Mitigation:** Follow existing migration flow from `docs/database/migration-flow.md`.
