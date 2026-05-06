---
title: "Phase 06: Testing & Validation"
description: "End-to-end validation of all CRUD operations, file uploads, AI pipeline, and connection stability against Supabase PostgreSQL"
status: pending
priority: P1
effort: 2h
branch: feature/supabase-database
---

## Context Links

- `src/lib/db/utils.ts` — all 12 CRUD functions to validate
- `src/lib/db/client.ts` — Prisma client (rewritten in Phase 05)
- `src/app/api/upload/route.ts` — file upload (rewritten in Phase 04)
- `src/app/actions/study-upload-action.ts` — text upload action
- `src/app/actions/study-simplify-action.ts` — simplify action
- `src/app/actions/study-generate-questions-action.ts` — question generation action
- `src/app/api/cards/review/route.ts` — card review API
- `src/app/api/cards/due/route.ts` — due cards API
- `src/app/api/progress/stats/route.ts` — progress stats API
- `src/app/api/study-session/route.ts` — study session API
- `src/lib/storage/supabase-storage.ts` — Storage utility (created in Phase 04)
- Phase 02 — Prisma migration (schema)
- Phase 04 — Storage migration (uploads)
- Phase 05 — Connection config (client)

## Overview

Validate the complete migration end-to-end. Every CRUD function, API route, AI pipeline component, and file upload flow must work against Supabase PostgreSQL. This phase catches integration issues between the individual phase changes.

## Key Insights

### Test Matrix

The app has these distinct data flows that must each be validated:

1. **User CRUD** — create, findUnique, upsert (demo user)
2. **Passage CRUD** — create, findUnique, findMany (by userId)
3. **Question CRUD** — create, createMany, deleteMany, findMany (by passageId)
4. **CardReview CRUD** — create, findMany (by userId + due date), update (SM-2)
5. **StudySession CRUD** — create, update (completion)
6. **File Upload** — upload to Storage, PDF parse, passage creation
7. **AI Pipeline** — CEFR detect, simplify, question generation (all persist to DB)
8. **Connection Stability** — pooled connection, concurrent requests, timeout handling

### Functions in `src/lib/db/utils.ts` to Validate

| Function | Operation | Validates |
|----------|-----------|-----------|
| `getDueCards(userId)` | READ | JOIN across 3 tables (CardReview -> Question -> Passage), WHERE on date |
| `getNewCards(userId, passageId)` | READ | Subquery with `none` filter on reviews |
| `calculateSM2Interval(...)` | COMPUTE | Pure function, no DB — no migration impact |
| `updateCardReview(id, rating)` | READ + UPDATE | findUniqueOrThrow + update with computed values |
| `getUserProgress(userId)` | READ | 4 parallel count queries with date filters |
| `createUser(email, name)` | CREATE | Basic insert |
| `getOrCreateUser(email, name)` | READ + CREATE | Upsert pattern |
| `createPassage(data)` | CREATE | Insert with enum fields, nullable fields |
| `createQuestion(data)` | CREATE | Insert with JSON field (`options`) |
| `createCardReview(qId, uId)` | CREATE | Insert with defaults |
| `getPassageWithQuestions(id)` | READ | JOIN Passage -> Questions |
| `getUserPassages(userId)` | READ | Filtered list with ordering |
| `createStudySession(userId, pId)` | CREATE | Insert with nullable FK |
| `updateStudySession(id, data)` | UPDATE | Partial update with computed accuracy |

### API Routes to Validate

| Route | Method | What to Test |
|-------|--------|--------------|
| `/api/upload` | POST | File upload -> Storage -> PDF parse -> DB persist |
| `/api/upload/text` | POST | Text validation -> analyze -> DB persist |
| `/api/cards/review` | POST | Submit review -> SM-2 calculation -> DB update |
| `/api/cards/due` | GET | Demo user lookup -> fetch due cards |
| `/api/study-session` | POST | Demo user lookup -> create session |
| `/api/study-session` | PATCH | Update session with completion data |
| `/api/progress/stats` | GET | Demo user lookup -> aggregate stats |

### Server Actions to Validate

| Action | What to Test |
|--------|--------------|
| `studyUploadAction` | CEFR detection -> passage creation |
| `studySimplifyAction` | Passage fetch -> AI simplify -> passage update |
| `studyGenerateQuestionsAction` | Passage fetch -> AI generate -> atomic question replace |

## Requirements

### Functional
- All 12+ CRUD functions produce correct results against PostgreSQL
- All 7 API routes return expected responses
- File uploads persist to Supabase Storage
- AI pipeline (CEFR, simplify, questions) persists results correctly
- Demo user flow works end-to-end
- SM-2 algorithm produces same results as SQLite (pure function, no DB)

### Non-Functional
- No connection errors under sequential requests
- No data type mismatches (especially `Json` -> `jsonb`)
- Date handling correct (PostgreSQL timestamp vs SQLite text dates)

## Related Code Files

| File | Action |
|------|--------|
| None | Validation only — no code changes unless bugs found |

## Implementation Steps

### Step 1: Database Connection Validation

1. Start local dev: `npm run dev`
2. Verify Prisma client connects to Supabase:
   ```bash
   npx prisma studio
   ```
   Should open Prisma Studio connected to Supabase PostgreSQL.

3. Check connection in Supabase Dashboard > Database > Connections — active connection visible.

### Step 2: User CRUD Validation

1. Trigger `getOrCreateDemoUser()` by hitting any API route (e.g., `GET /api/progress/stats`)
2. Verify in Supabase Table Editor: `users` table has one row with `demo@example.com`
3. Verify fields: `id` (CUID), `email`, `name`, `targetLevel` (B2), `createdAt`, `updatedAt`

### Step 3: Passage CRUD + AI Pipeline Validation

1. **Text upload** via study page or `POST /api/upload/text`:
   ```json
   { "text": "<50+ char English text>", "title": "Test Passage" }
   ```
2. Verify response includes `passageId`, `originalLevel`
3. Verify `passages` table in Supabase: correct row with all fields
4. Verify `questions` table: 5 rows linked to passage, `options` field is valid JSON

5. **Simplify** via study page or `studySimplifyAction`:
   - Verify passage updated with `simplifiedContent` and `simplifiedLevel`
6. **Generate questions** via study page or `studyGenerateQuestionsAction`:
   - Verify old questions deleted, new questions created (atomic replace)

### Step 4: File Upload + Storage Validation

1. Upload a PDF file via study page or `POST /api/upload` (multipart form)
2. Verify file appears in Supabase Storage > `content-uploads` bucket
3. Verify `passages` table: `fileUrl` column populated with Storage URL
4. Verify PDF was parsed (text extracted, questions generated)

### Step 5: SM-2 + CardReview Validation

1. Answer questions in flashcard test
2. Verify `POST /api/cards/review` returns success
3. Check `card_reviews` table: row created/updated with SM-2 fields
4. Verify `easeFactor`, `intervalDays`, `repetitions`, `nextReviewDate` are computed correctly
5. Verify composite unique constraint: `[questionId, userId]`

### Step 6: Due Cards + Progress Validation

1. `GET /api/cards/due` — verify returns due cards with nested question + passage data
2. `GET /api/progress/stats` — verify returns `{ totalCards, matureCards, dueCards, todayReviews }`
3. Verify date-based queries work correctly (PostgreSQL timestamp handling)

### Step 7: Study Session Validation

1. `POST /api/study-session` with `{ passageId }` — verify session created
2. Answer some cards
3. `PATCH /api/study-session` with completion data — verify session updated with `accuracyRate`

### Step 8: Connection Stability

1. Run 10 sequential requests to different API routes
2. Verify no connection drops, timeouts, or pool exhaustion
3. Check Supabase Dashboard > Database > Connections for connection count
4. Verify pgBouncer is pooling (connection count should stay low despite multiple requests)

### Step 9: Data Type Validation

Verify PostgreSQL-specific type handling:
- `options` field (JSON) round-trips correctly: write array of objects, read back identical structure
- Enum fields store/retrieve correctly: `CEFRLevel`, `SourceType`, `QuestionType`
- `DateTime` fields use PostgreSQL `timestamp` correctly (not text like SQLite)
- `Float` fields (`easeFactor`, `accuracyRate`) have correct precision
- Nullable fields (`simplifiedContent`, `passageId`, `completedAt`) handle `null` correctly

### Step 10: Regression Check

1. Full walk-through of study flow:
   - Upload text -> view passage -> simplify -> generate questions -> answer questions -> check progress
2. Full walk-through of upload flow:
   - Upload PDF -> view passage -> take quiz -> review results
3. Verify no console errors, no Sentry errors, no 500 responses

## Todo List

- [ ] Database connection valid (Prisma Studio + Supabase Dashboard)
- [ ] User CRUD: demo user created/retrieved correctly
- [ ] Passage CRUD: create, read, update (simplify) work
- [ ] Question CRUD: create, delete+createMany (atomic replace) work
- [ ] CardReview CRUD: SM-2 update with computed fields works
- [ ] StudySession CRUD: create and update (completion) work
- [ ] File upload: PDF -> Storage -> parse -> persist pipeline works
- [ ] AI pipeline: CEFR + simplify + questions all persist to DB
- [ ] JSON field: `options` round-trips correctly
- [ ] Enum fields: all 3 enums store/retrieve correctly
- [ ] Date fields: PostgreSQL timestamps handled correctly
- [ ] Connection stability: 10 sequential requests, no drops
- [ ] Full study flow walk-through: upload -> read -> quiz -> progress
- [ ] Full upload flow walk-through: PDF upload -> view -> test

## Success Criteria

- [ ] All 12 CRUD functions in `db/utils.ts` return correct results
- [ ] All 7 API routes return 200 with expected data
- [ ] File uploads stored in Supabase Storage, `fileUrl` in DB
- [ ] SM-2 algorithm produces identical results (pure function validation)
- [ ] JSON `options` field round-trips: `{ id, text }[]` written and read identically
- [ ] Enum values stored and retrieved without error
- [ ] Date queries work (`nextReviewDate <= now()`, `reviewedAt >= today`)
- [ ] No connection errors in 10+ sequential requests
- [ ] No `better-sqlite3` or SQLite adapter references in codebase
- [ ] `npm run build` succeeds
- [ ] Full study flow works end-to-end without errors

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| JSON field serialization differs between SQLite and PostgreSQL | Low | High | Prisma abstracts this; test `options` field explicitly |
| Date comparison behavior differs (timezone handling) | Medium | Medium | PostgreSQL stores timestamps with timezone; verify `new Date()` comparisons work |
| Connection drops under concurrent requests | Low | Medium | pgBouncer handles pooling; test with sequential then parallel requests |
| AI pipeline timeout (unrelated to DB migration) | Low | Low | Same OpenAI dependency; no migration impact |
| `jsonb` query performance on `options` field | Very Low | Low | Field is not indexed/queried by value; just stored and retrieved |

## Security Considerations

- All validation uses demo user — no auth-dependent testing
- Verify no credentials logged during testing
- Verify Storage URLs are not publicly accessible (signed URLs required)
- Verify `SUPABASE_SERVICE_ROLE_KEY` not in any test output or logs

## Rollback Plan

If validation reveals critical issues:
1. Identify the failing phase from test results
2. Revert that specific phase (each phase has its own rollback plan)
3. Fix the issue and re-validate
4. If multiple phases have issues, consider full rollback: revert all phases and restore SQLite

## Next Steps

- If all tests pass: migration is complete, ready for PR review
- If tests fail: fix issues in the responsible phase, re-run validation
- Post-migration: update `docs/system-architecture.md` and `docs/codebase-summary.md` to reflect Supabase
