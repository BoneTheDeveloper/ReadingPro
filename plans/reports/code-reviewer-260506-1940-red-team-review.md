# Red-Team Review: Adversarial Verification of Stage 2 Findings

**Date:** 2026-05-06
**Reviewer:** code-reviewer (adversarial mode)
**Scope:** 18 source files across actions, API routes, lib modules, AI layer, validation, and DB layer

---

## Stage 2 Findings: Verdicts

### C1: Race condition in demo user creation (find-then-create)

**VERDICT: CONFIRMED — ESCALATED to Critical**
**SEVERITY: Critical**
**CATEGORY: Race / Data**

**EVIDENCE — 5 locations, 2 distinct patterns:**

Pattern A — `findUnique` then `create` (no upsert):
- `src/app/actions/study-shared.ts:11-14` — `getOrCreateDemoUser()`
- `src/lib/db/utils.ts:142-145` — `getOrCreateUser()`
- `src/app/actions/analyze.ts:91-94` — inline in `analyzeContentAction`
- `src/app/actions/analyze.ts:218-221` — inline in `studyAnalyzeAction`
- `src/app/api/study-session/route.ts:14-18` — inline in `POST`

Pattern B — `upsert` (safe):
- `src/app/api/cards/due/route.ts:12-16`
- `src/app/api/progress/stats/route.ts:12-16`

**ATTACK:** Two concurrent requests hit `analyzeContentAction` simultaneously. Both execute `findUnique` — both get `null`. Both proceed to `create`. SQLite with better-sqlite3 is serialized at the adapter level for writes, but the first `create` succeeds and the second throws a unique constraint violation on `email`. The error is NOT caught in `analyze.ts:91-94` (it's inside a Sentry span but has no try/catch around the create). The outer `try` in the Sentry instrumentation handler will catch it, but it surfaces as a generic "Upload failed" error — the user sees a 500 despite valid input.

**IMPACT:** Unhandled 500 on concurrent first-ever requests. Not data corruption (SQLite unique constraint prevents it), but a reliability bug that appears in production under load.

**FIX_JUDGMENT:** Stage 2 proposed upsert. That is correct and sufficient. All 5 locations must use `db.user.upsert()` with `update: {}` (no-op update). The 2 locations already using upsert prove the pattern exists in the codebase.

---

### C2: No input validation on passageId/sessionId/cardReviewId

**VERDICT: CONFIRMED — ESCALATED**
**SEVERITY: High**
**CATEGORY: Security / Assumption**

**EVIDENCE:**

| Parameter | Location | Validation |
|-----------|----------|------------|
| `passageId` | `study-simplify-action.ts:22` | None — passed directly to `findUnique` |
| `passageId` | `study-generate-questions-action.ts:19` | None — passed directly to `findUnique` then `deleteMany` + `createMany` |
| `cardReviewId` | `cards/review/route.ts:10` | Only checks `!cardReviewId` (truthy), no format check |
| `sessionId` | `study-session/route.ts:46` | None — destructured from body, passed to `update` |
| `passageId` | `study-session/route.ts:12` | None — passed to `create` as FK |

**ATTACK on `study-generate-questions-action.ts`:**
1. Attacker sends `passageId: "nonexistent"` — `findUnique` returns null, returns `{ error: 'Passage not found' }`. This is benign.
2. Attacker sends `passageId: ""` — Prisma throws on empty string for `where: { id: "" }`. Unhandled in the Sentry span wrapper, surfaces as 500.
3. Attacker sends `passageId: "' OR 1=1 --"` — Prisma parameterizes queries, so SQL injection is blocked. But the string hits SQLite and fails. 500.
4. Attacker sends a valid `passageId` belonging to another user's passage — **no ownership check**. They can delete all questions and replace them.

**ATTACK on `study-session PATCH` (C3 combination):**
Attacker crafts `sessionId` of any valid session ID. They can set `accuracyRate` to any value, mark sessions as completed, etc. No user check.

**IMPACT:** No SQL injection (Prisma protects), but:
- Arbitrary passage manipulation (delete/replace questions on any passage)
- Arbitrary session data manipulation
- DoS via crafted IDs that cause unhandled Prisma errors (500s)

**FIX_JUDGMENT:** Proposed fix (Zod validation of ID format) is necessary but insufficient. Must also add **ownership checks**: verify the resource belongs to the demo user before mutating. For `passageId`, query `passage.findUnique({ where: { id }, include: { user: true } })` and verify `userId === demoUser.id`.

---

### C3: No ownership check on study-session PATCH

**VERDICT: CONFIRMED — ESCALATED**
**SEVERITY: High**
**CATEGORY: Security**

**EVIDENCE:** `src/app/api/study-session/route.ts:44-75`

```typescript
const { sessionId, cardsReviewed, correctCount, incorrectCount } = await request.json();
const session = await db.studySession.update({ where: { id: sessionId }, data: { ... } });
```

No user lookup. No verification that `session.userId` belongs to the caller. Since there is no auth at all (all requests use the hardcoded demo user for creation), this is a data integrity issue — any caller with a valid session ID can mutate it.

**ATTACK:** POST to create a session (gets session ID back in response). Capture a different session ID (e.g., from browser dev tools of another user in a multi-tenant future). PATCH with arbitrary stats.

**IMPACT:** In current single-user demo mode: data integrity bug. In any multi-user future: critical authorization bypass.

**FIX_JUDGMENT:** Proposed fix (add user verification) is correct. Must query session first, verify `userId`, then update.

---

### H1: ~280 lines duplicated between analyzeContentAction and studyAnalyzeAction

**VERDICT: CONFIRMED**
**SEVERITY: Medium**
**CATEGORY: Supply / Maintainability**

**EVIDENCE:** `src/app/actions/analyze.ts:15-132` vs `src/app/actions/analyze.ts:134-283`

Line-by-line identical logic:
- CEFR detection with fallback (lines 32-46 vs 152-167)
- Content simplification (lines 48-68 vs 170-192)
- Question generation (lines 73-88 vs 197-213)
- Demo user creation with race condition (lines 91-95 vs 218-222)
- Passage creation with questions (lines 98-123 vs 225-251)

Only differences: `studyAnalyzeAction` adds per-step timing logs, and the return shape is different.

**IMPACT:** Bug fixes must be applied in 2 places. The race condition (C1) is duplicated. If someone fixes one and not the other, divergent behavior.

**FIX_JUDGMENT:** Extract shared pipeline into a private function. Both actions call it. Delete one of the two public exports if both are not needed.

---

### H2: No text length validation in studyUploadAction

**VERDICT: CONFIRMED — ESCALATED**
**SEVERITY: High**
**CATEGORY: Security / Failure**

**EVIDENCE:** `src/app/actions/study-upload-action.ts:27-35`

```typescript
if (!text || text.length < 50) {
  return { error: 'Text too short (minimum 50 characters)' };
}
```

No upper bound check. The text is then:
1. Truncated to 10000 chars for AI analysis (line 38: `text.slice(0, 10000)`)
2. But stored in full: `db.passage.create({ data: { content: text } })` at line 69

**ATTACK:** Send a 50MB text payload to `studyUploadAction`. The action:
- Stores all 50MB in SQLite (passes — SQLite handles large texts but this is a performance bomb)
- Sends only 10K chars to AI (truncated, so AI cost is bounded)
- Returns the full passage data including all 50MB of content in the response (line 80-90)

Compare with `src/lib/validation/upload.ts:33-49` which has `validateTextContent` with a 100K char limit — but this function is only called from `api/upload/text/route.ts`, NOT from the server action `studyUploadAction`.

**IMPACT:**
- Memory pressure: 50MB string in Node.js heap per request
- DB bloat: SQLite stores 50MB blobs
- Response size: Full content echoed back to client
- No OOM crash (Node.js handles large strings), but severe performance degradation under concurrent large uploads

**FIX_JUDGMENT:** Proposed fix (add max length check) is correct. Must apply in `studyUploadAction` before any processing. Reuse `validateTextContent` from `src/lib/validation/upload.ts`.

---

### H3: Uploaded files never cleaned up (disk leak)

**VERDICT: CONFIRMED**
**SEVERITY: Medium**
**CATEGORY: Data / Supply**

**EVIDENCE:** `src/app/api/upload/route.ts:43-50`

File written to `uploads/content/${timestamp}-${safeName}`. Zero calls to `unlink`, `rm`, `rimraf`, or `cleanup` anywhere in the codebase (confirmed by grep). No scheduled cleanup job. No TTL mechanism.

**ATTACK:** Upload 10,000 files over time. Disk fills. The app never deletes any of them. On Vercel, `/uploads` is read-only ephemeral filesystem — files disappear on cold start but accumulate during a single server instance's lifetime.

**IMPACT:** On self-hosted: unbounded disk growth. On Vercel: ephemeral, so files lost on redeploy (which means `fileUrl` in the Passage model is useless).

**FIX_JUDGMENT:** Proposed fix (add cleanup after processing) is correct. Delete the file immediately after text extraction succeeds, before calling `analyzeContentAction`. If analysis fails, still delete the file (in the catch block).

---

### H4: deleteMany + createMany without transaction (data loss)

**VERDICT: CONFIRMED — ESCALATED**
**SEVERITY: High**
**CATEGORY: Race / Data**

**EVIDENCE:** `src/app/actions/study-generate-questions-action.ts:60-75`

```typescript
await db.question.deleteMany({ where: { passageId } });
await db.question.createMany({
  data: questions.map(q => ({ passageId, ... })),
});
```

**ATTACK:**
1. User clicks "Generate Questions" — request A starts, deletes all questions for passage X
2. Request A's AI call takes 15 seconds (network latency)
3. Server crashes or request A times out after deleteMany but before createMany
4. All original questions are gone, no new questions created
5. User sees empty question list permanently

SQLite serializes writes via better-sqlite3, so concurrent requests to the same passage are serialized — but crash/restart between the two operations is still possible.

Additionally: `deleteMany` on `passageId` deletes **all** questions for that passage. If `questions.map()` produces an empty array (AI returned 0 questions but the length check on line 55 was somehow bypassed — edge case with AI returning malformed data), `createMany` with empty data is a no-op. All questions deleted, zero created.

**IMPACT:** Permanent data loss of all questions for a passage. User must re-upload.

**FIX_JUDGMENT:** Wrap in `db.$transaction()`. Also, validate `questions.length > 0` before deleting (move the check from line 55 to before line 61, or better: delete only after successful generation).

---

### H5: SM-2 algorithm duplicated in 2 files

**VERDICT: CONFIRMED**
**SEVERITY: Medium**
**CATEGORY: Supply**

**EVIDENCE:**
- `src/lib/algorithms/sm2.ts:11-46` — `calculateSM2()` (standalone utility)
- `src/lib/db/utils.ts:37-76` — `calculateSM2Interval()` (embedded in DB utils)

Both implement the same SM-2 formula with minor differences:

| Aspect | `sm2.ts` | `db/utils.ts` |
|--------|----------|---------------|
| Ease factor clamping | After calculation (line 26) | During calculation (line 57-58) |
| `easeFactor.toFixed(2)` | Yes (line 41) | Yes (line 72) |
| Return shape | `{ easeFactor, intervalDays, repetitions, nextReviewDate }` | `{ easeFactor, intervalDays, repetitions }` |
| Used by | Nothing (dead code) | `updateCardReview()` in same file |

**CRITICAL FINDING:** `src/lib/algorithms/sm2.ts` is **dead code**. No file imports from it. The `calculateSM2` function is never called. The `getSuggestedRating`, `isCardDue`, and `getCardStatus` helpers are also never imported anywhere.

**IMPACT:** If someone fixes a bug in `sm2.ts`, it has zero effect. The actual algorithm running is the one in `db/utils.ts`. Divergent fixes are almost certain.

**FIX_JUDGMENT:** Delete `src/lib/algorithms/sm2.ts` entirely (dead code). Keep `calculateSM2Interval` in `db/utils.ts` as the single source of truth. Extract it to `src/lib/algorithms/sm2.ts` if you want separation of concerns, but then delete the duplicate in `db/utils.ts`.

---

## Additional Findings (Missed by Stage 2)

### NEW-C1: AI prompts in actions lack system prompts (silent quality degradation)

**VERDICT: NEW — CONFIRMED**
**SEVERITY: Medium**
**CATEGORY: Failure / Supply**

**EVIDENCE:**

The standalone AI modules (`cefr-detector.ts`, `content-simplifier.ts`, `question-generator.ts`) all define proper `system` prompts with detailed instructions. But the inline AI calls in `analyze.ts` and other actions use **bare prompts with no system instruction**:

- `analyze.ts:35-39`: `prompt: "Analyze text and return CEFR level: ${text}"` — no system prompt
- `analyze.ts:57-61`: `prompt: "Simplify to ${targetLevel}: ${text}"` — no system prompt
- `analyze.ts:78-82`: `prompt: "Generate 5 comprehension questions for: ${text}"` — no system prompt
- `study-upload-action.ts:46-50`: `prompt: "Analyze text and return CEFR level: ${text}"` — no system prompt
- `study-simplify-action.ts:49-53`: `prompt: "Simplify to ${targetLevel}: ${text}"` — no system prompt
- `study-generate-questions-action.ts:42-46`: `prompt: "Generate 5 comprehension questions for: ${text}"` — no system prompt

Compare with the module versions that have detailed system prompts:
- `cefr-detector.ts:24`: "You are an expert English language educator specializing in CEFR level assessment. Analyze vocabulary complexity, grammar structures, sentence variety, and cohesion."
- `content-simplifier.ts:33`: "You are an expert English language educator. Simplify text to target CEFR level while maintaining core meaning, logical flow, and key terminology..."
- `question-generator.ts:46`: "You are an expert English language educator. Generate multiple-choice reading comprehension questions that: test understanding (not memory), have clear answers..."

**ATTACK:** The inline prompts produce lower quality output because the model has no persona or instructions. The CEFR detection prompt is particularly weak — without the system prompt specifying what to analyze (vocabulary, grammar, sentence structure, cohesion), the model may use different criteria each time.

**IMPACT:** Inconsistent AI output quality. The standalone modules exist but are dead code — never called by the actions.

**FIX:** The standalone modules (`detectCEFRLevel`, `simplifyContent`, `generateComprehensionQuestions`) should be used directly by the actions instead of duplicating AI calls inline. This fixes both H1 (duplication) and this finding (missing system prompts).

---

### NEW-C2: wordCount calculation inconsistency (3 different methods)

**VERDICT: NEW — CONFIRMED**
**SEVERITY: Low**
**CATEGORY: Data**

**EVIDENCE:**

| Location | Method | Empty string result |
|----------|--------|-------------------|
| `analyze.ts:107` | `text.split(/\s+/).length` | 1 (splits to `[""]`) |
| `analyze.ts:234` | `text.split(/\s+/).length` | 1 |
| `study-upload-action.ts:71` | `text.split(/\s+/).length` | 1 |
| `upload/route.ts:64` | `text.split(/\s+/).filter(w => w.length > 0).length` | 0 |

The `filter(w => w.length > 0)` variant is correct. The bare `.length` variant returns 1 for an empty string and counts extra "words" when text has leading/trailing/multiple spaces.

**IMPACT:** Stored `wordCount` in DB is wrong for texts with irregular whitespace. Affects reading time calculations, question count heuristics, and any analytics.

**FIX:** Standardize on `text.split(/\s+/).filter(w => w.length > 0).length` everywhere. Extract to a utility function.

---

### NEW-C3: correctAnswer not validated against options[].id

**VERDICT: NEW — CONFIRMED**
**SEVERITY: High**
**CATEGORY: Data / Failure**

**EVIDENCE:**

`question-generator.ts:8-22` defines the schema:
```typescript
options: z.array(questionOptionSchema),  // { id: z.string(), text: z.string() }
correctAnswer: z.string(),              // no constraint linking to options[].id
```

The `correctAnswer` field is a standalone string with no validation that it matches any `options[].id`.

`study-generate-questions-action.ts:63-73` stores directly:
```typescript
correctOption: q.correctAnswer,
options: JSON.stringify(q.options),
```

`analyze.ts:110-119` same pattern.

**ATTACK:** The AI model returns `correctAnswer: "A"` but `options: [{ id: "opt-1", text: "..." }, ...]`. The quiz UI presumably matches `correctAnswer` against `options[].id` — they never match. Every question becomes unanswerable. The user always gets "wrong" regardless of selection.

This is a realistic failure mode: GPT-4o-mini frequently returns non-deterministic IDs. Without explicit instructions to set `correctAnswer` to one of the `options[].id` values, the model may use any string format.

**IMPACT:** Silent data corruption. Questions created with mismatched `correctAnswer` are permanently broken. SM-2 algorithm records "wrong" ratings, pushing card intervals down. User experience degrades as all cards show as "learning" forever.

**FIX:** Add a refinement step after AI generation: validate `correctAnswer` exists in `options.map(o => o.id)`. If not, pick the first option as a fallback (or regenerate). Alternatively, add Zod `.refine()` to the schema:
```typescript
correctAnswer: z.string().refine(
  (val) => ctx.options.some(o => o.id === val),
  "correctAnswer must match an option id"
)
```
Or use a `.superRefine()` on the parent schema.

---

### NEW-C4: No timeout on AI calls (unbounded server action duration)

**VERDICT: NEW — CONFIRMED**
**SEVERITY: High**
**CATEGORY: Failure**

**EVIDENCE:** All `generateObject()` calls have no timeout configuration. There is zero usage of `maxDuration`, `timeout`, `maxRetries`, or `abort` anywhere in the codebase.

Next.js server actions have a default timeout (varies by platform — Vercel Hobby is 10s, Pro is 60s). But the AI calls within `analyzeContentAction` make **3 sequential** AI calls (CEFR detect + simplify + question generation), each potentially taking 5-15 seconds.

**ATTACK:** Normal request flow: CEFR detection takes 8s, simplification takes 12s, question generation takes 15s = 35s total. On Vercel Hobby tier (10s timeout), this ALWAYS fails. On Vercel Pro (60s), it's within limit but leaves no headroom.

If OpenAI has an outage or returns slow responses (common during peak hours), the server action hangs until the platform kills it. The user sees no feedback during this time — the action is `await`-ed client-side with no progress indication.

**IMPACT:** Server actions timeout unpredictably. No partial results saved (if CEFR detection succeeds but simplification hangs, the passage is never created). User loses all work.

**FIX:** Add `maxDuration` to each `generateObject()` call (e.g., 30 seconds). Add `abortSignal` with `AbortSignal.timeout()`. Save partial results incrementally — create the passage first, then update with AI results as they complete.

---

### NEW-C5: Unbounded simplifiedText length stored in DB

**VERDICT: NEW — CONFIRMED**
**SEVERITY: Medium**
**CATEGORY: Data**

**EVIDENCE:** `simplifiedContentSchema` in `content-simplifier.ts:9`:
```typescript
simplifiedText: z.string(),  // no max length
```

The simplified text is generated from user input (up to 10K chars for AI, but full text for `study-simplify-action.ts:52` which uses `passage.content.slice(0, 10000)`). The AI model may return text longer than the input (expanding explanations, adding parenthetical definitions).

The simplified text is stored directly in `passage.simplifiedContent` (no truncation). There is no column size limit in the Prisma schema (`String` type in SQLite is unbounded).

**ATTACK:** Provide input text with many technical terms. The simplifier adds explanations in parentheses for each term, potentially doubling or tripling the text length. A 10K input could produce a 30K simplified text.

**IMPACT:** Minor — SQLite handles large strings. But the simplified text is sent back to the client and rendered in the UI. Extremely long simplified text could cause rendering performance issues.

**FIX:** Add `.max(50000)` to `simplifiedText` schema validation. Truncate if needed.

---

### NEW-C6: studyAnalyzeAction returns full passage content in response (data exposure)

**VERDICT: NEW — CONFIRMED**
**SEVERITY: Medium**
**CATEGORY: Security / Data**

**EVIDENCE:** `analyze.ts:255-263`:
```typescript
const passageData = {
  id: passage.id,
  title: passage.title,
  content: passage.content,         // full content, potentially huge
  simplifiedContent: passage.simplifiedContent,
  ...
};
```

The entire passage content (potentially 100K chars for the text upload route, or unbounded for `studyUploadAction` with H2 unfixed) is serialized into the server action response. Server action responses are serialized via React Server Components protocol, which adds overhead.

Compare with `analyzeContentAction` (lines 125-130) which only returns `passageId`, `originalLevel`, `simplifiedLevel`, `questionCount` — a much leaner response.

**IMPACT:** Large response payloads. For a 100K char passage, the serialized response could be several hundred KB. This is transmitted over the network on every analysis call.

**FIX:** Return only `passageId` and metadata. The client can fetch the full content from a separate endpoint if needed (or use the passage data it already has from the upload step).

---

### NEW-C7: No auth on any server action or API route (design note, not fixable now)

**VERDICT: NEW — CONFIRMED**
**SEVERITY: Medium (current) / Critical (future)**
**CATEGORY: Security**

**EVIDENCE:** Every server action and API route uses either:
- Hardcoded `DEMO_USER_EMAIL = 'demo@example.com'`
- No user lookup at all (PATCH study-session)

No middleware.ts exists. No `auth()`, `getSession()`, `clerk()`, or any auth library import anywhere.

**IMPACT:** Acceptable for demo/prototype. Becomes critical the moment any real user data is stored. Every endpoint is a wide-open API.

**FIX:** Out of scope for this review. Note as a prerequisite for any production deployment.

---

## Summary Table

| ID | Finding | Verdict | Severity | Category |
|----|---------|---------|----------|----------|
| C1 | Race condition in demo user creation | CONFIRMED, ESCALATED | Critical | Race/Data |
| C2 | No input validation on IDs | CONFIRMED, ESCALATED | High | Security/Assumption |
| C3 | No ownership check on session PATCH | CONFIRMED, ESCALATED | High | Security |
| H1 | 280 lines duplicated | CONFIRMED | Medium | Supply |
| H2 | No text length validation in upload action | CONFIRMED, ESCALATED | High | Security/Failure |
| H3 | Files never cleaned up | CONFIRMED | Medium | Data/Supply |
| H4 | deleteMany+createMany without transaction | CONFIRMED, ESCALATED | High | Race/Data |
| H5 | SM-2 duplicated, one is dead code | CONFIRMED | Medium | Supply |
| NEW-C1 | Inline AI calls lack system prompts | NEW | Medium | Failure/Supply |
| NEW-C2 | wordCount calculation inconsistency | NEW | Low | Data |
| NEW-C3 | correctAnswer not validated vs options | NEW | High | Data/Failure |
| NEW-C4 | No timeout on AI calls | NEW | High | Failure |
| NEW-C5 | Unbounded simplifiedText length | NEW | Medium | Data |
| NEW-C6 | Full content returned in action response | NEW | Medium | Security/Data |
| NEW-C7 | No auth anywhere | NEW | Medium (now) | Security |

---

## Recommended Fix Priority

1. **C1 + H4** — Race conditions causing 500s and data loss. Use `upsert` and `$transaction`.
2. **H2 + C2** — Input validation gaps. Add max length, validate ID format, add ownership checks.
3. **NEW-C3** — correctAnswer/options mismatch. Add Zod refinement. This causes silent data corruption.
4. **NEW-C4** — AI call timeouts. Add `AbortSignal.timeout()` and `maxDuration`.
5. **C3** — Ownership check on PATCH. Add user verification.
6. **H1 + NEW-C1** — Refactor actions to use standalone AI modules. Fixes duplication AND missing system prompts in one change.
7. **H3** — File cleanup. Delete after extraction.
8. **H5** — Delete dead `sm2.ts`. Single source of truth.
9. **NEW-C2 + NEW-C5 + NEW-C6** — Data quality. Standardize wordCount, bound simplified text, trim response.

---

## Unresolved Questions

- Is `analyzeContentAction` still used? It appears to be the old code path (called from `api/upload/route.ts`). If `studyUploadAction` + `studyGenerateQuestionsAction` replace it, it should be deleted.
- Is `src/lib/algorithms/sm2.ts` intentionally kept as a future reference? No file imports it.
- What is the intended deployment target? Vercel serverless has strict timeouts (10s hobby, 60s pro) that make 3 sequential AI calls infeasible without streaming or background jobs.
