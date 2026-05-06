# Code Review: API Routes, Server Actions, and Supporting Libraries

**Date:** 2026-05-06
**Reviewer:** code-reviewer
**Scope:** 7 API routes, 5 server actions, 7 library files
**Focus:** Security, correctness, performance, code quality

---

## Critical Issues

### C1. Race condition in demo user creation -- duplicate insert crash
**FILE:** `src/app/actions/study-shared.ts:9-18`, `src/app/actions/analyze.ts:91-95`, `src/app/api/study-session/route.ts:14-19`
**ISSUE:** The find-then-create pattern (`findUnique` then `create`) is not atomic. Two concurrent requests can both see `user === null` and both attempt `db.user.create`, causing a unique constraint violation on `email`. SQLite will throw `PrismaClientKnownRequestError (P2002)`, which is caught by the outer try/catch and surfaces as a 500 to the user despite being a transient race.
**FIX:** Use `db.user.upsert()` everywhere, which is atomic. Already used correctly in `cards/due/route.ts:12` and `progress/stats/route.ts:12` -- apply the same pattern to all other locations. The `getOrCreateDemoUser()` function in `study-shared.ts` should be the single source of truth using `upsert`.

### C2. No input validation on `passageId` in multiple endpoints
**FILE:** `src/app/api/study-session/route.ts:12`, `src/app/api/cards/review/route.ts:10`, `src/app/actions/study-simplify-action.ts:22`, `src/app/actions/study-generate-questions-action.ts:19`
**ISSUE:** `passageId` and `cardReviewId` are taken directly from user-supplied JSON with no format/length/type validation. An attacker can supply arbitrary strings. While Prisma parameterizes queries (preventing SQL injection), invalid CUIDs will cause unhandled `PrismaClientKnownRequestError` (P2025: record not found) that leak internal error details through Sentry and the 500 response path. More importantly, `study-session PATCH` (line 46-53) takes `sessionId` with zero validation and directly does `db.studySession.update` -- any authenticated user (or unauthenticated in this demo) can update any session.
**FIX:** Validate that IDs match expected CUID format (24-char alphanumeric). For session PATCH, verify the session belongs to the requesting user before updating.

### C3. No `study-session` PATCH ownership check -- any session can be modified
**FILE:** `src/app/api/study-session/route.ts:44-75`
**ISSUE:** The PATCH handler updates a study session by `sessionId` with no verification that the session belongs to the demo user. While there is only one user today, this is a trust boundary violation that will become a real auth bypass once auth is added.
**FIX:** Add `userId` to the `where` clause: `where: { id: sessionId, userId: user.id }`. Do the user lookup first (same as POST).

---

## High Priority

### H1. `analyzeContentAction` and `studyAnalyzeAction` are near-identical duplicates
**FILE:** `src/app/actions/analyze.ts:15-132` vs `src/app/actions/analyze.ts:134-283`
**ISSUE:** `analyzeContentAction` (lines 15-132) and `studyAnalyzeAction` (lines 134-283) implement the same 4-step pipeline (CEFR detect, simplify, generate questions, DB save) with minor differences in logging and return shape. `analyzeContentAction` is only called from the legacy upload API route. This is ~280 lines of duplicated logic including 3 AI calls each.
**FIX:** Delete `analyzeContentAction` and migrate `api/upload/route.ts` and `api/upload/text/route.ts` to use `studyUploadAction` + `studySimplifyAction` + `studyGenerateQuestionsAction` (the new split actions). This also eliminates the inconsistency where `analyzeContentAction` does 3 AI calls in one request vs the new pattern of separate actions.

### H2. No text length validation in `studyUploadAction`
**FILE:** `src/app/actions/study-upload-action.ts:34`
**ISSUE:** Only checks `text.length < 50` but has no upper bound. The `validateTextContent` function in `lib/validation/upload.ts` enforces a 100,000 character limit, but `studyUploadAction` does not use it. The full text is saved to DB and sent to the AI model (up to 10,000 chars for CEFR prompt). A user could submit multi-MB text payloads.
**FIX:** Import and call `validateTextContent(text)` at the top of `studyUploadAction`. Same for `studyAnalyzeAction` at line 141.

### H3. Uploaded files never cleaned up -- disk leak
**FILE:** `src/app/api/upload/route.ts:40-50`
**ISSUE:** Files are written to `uploads/content/` but never deleted after processing. The text is extracted, parsed, then the passage is stored in the DB. The on-disk file serves no further purpose. Over time this will fill the disk. No `unlink` or cleanup mechanism exists anywhere in the codebase.
**FIX:** Delete the file after successful processing (in a `finally` block to also clean up on failure). Alternatively, stream the file into a temporary location and use `fs.rm` in the cleanup path.

### H4. `deleteMany` + `createMany` without transaction in question regeneration
**FILE:** `src/app/actions/study-generate-questions-action.ts:60-75`
**ISSUE:** Questions are deleted then recreated in two separate DB calls. If the `createMany` fails, all existing questions are already gone. This is a data loss scenario.
**FIX:** Wrap both operations in `db.$transaction([db.question.deleteMany(...), db.question.createMany(...)])`.

### H5. Duplicated SM-2 calculation logic
**FILE:** `src/lib/algorithms/sm2.ts:11-46` vs `src/lib/db/utils.ts:37-76`
**ISSUE:** The SM-2 interval calculation is implemented twice with slightly different signatures. `calculateSM2` in `sm2.ts` returns a `nextReviewDate` object; `calculateSM2Interval` in `utils.ts` returns the raw interval values. `updateCardReview` in `utils.ts` uses its own local copy, ignoring `sm2.ts` entirely.
**FIX:** Delete `calculateSM2Interval` from `utils.ts` and have `updateCardReview` call `calculateSM2` from `sm2.ts`.

---

## Medium Priority

### M1. `correctCount / total` can produce `NaN` when both are 0
**FILE:** `src/app/api/study-session/route.ts:59`
**ISSUE:** `accuracyRate: total > 0 ? (correctCount / total) * 100 : null` -- `total` is computed as `(correctCount || 0) + (incorrectCount || 0)`. This is correct. However, the falsy check on line 49 (`cardsReviewed || 0`) means `cardsReviewed: 0` from the client becomes 0, but `cardsReviewed: 10` works fine. No actual bug here, but the `||` pattern is fragile -- `cardsReviewed: false` would silently become 0.
**FIX:** Use nullish coalescing (`?? 0`) instead of `|| 0` for all numeric fields to handle edge cases like explicit `0` values from the client.

### M2. No timeout on AI API calls
**FILE:** `src/app/actions/analyze.ts` (lines 34, 56, 77), `study-upload-action.ts:45`, `study-simplify-action.ts:48`, `study-generate-questions-action.ts:41`
**ISSUE:** All `generateObject` calls to OpenAI have no timeout configuration. A hung AI call will hold the request open indefinitely, consuming server resources. The Vercel AI SDK supports `maxTokens` but not request-level timeouts by default.
**FIX:** Wrap AI calls with `Promise.race` against a timeout (e.g., 30s), or use `AbortController` with a timeout signal. The SDK's `fetch` override or middleware can also enforce this.

### M3. `wordCount` calculation is inconsistent
**FILE:** `src/app/api/upload/route.ts:64`, `src/app/actions/analyze.ts:107`, `src/app/actions/study-upload-action.ts:71`
**ISSUE:** `text.split(/\s+/).length` counts "words" by whitespace splitting. For an empty string, this returns `[""].length === 1`. For a string with leading/trailing whitespace, it may include empty strings. The regex `/\s+/` on `"hello  world"` gives `["hello", "world"]` (correct), but on `"  "` gives `[""]` (wrong, returns 1 word).
**FIX:** Use `text.split(/\s+/).filter(w => w.length > 0).length` consistently. The upload route already does this correctly (line 64); the server actions do not.

### M4. `options` field stored as JSON string but DB schema is `Json` type
**FILE:** `src/app/actions/analyze.ts:112`, `src/app/actions/study-generate-questions-action.ts:66`
**ISSUE:** `JSON.stringify(q.options)` converts the array to a string, but the Prisma schema declares `options Json`. When read back, the value will be a string containing JSON, not a parsed JSON object. Then in `analyze.ts:267`, the code does `JSON.parse(q.options as string)` to reverse this. This works but is fragile -- `study-generate-questions-action.ts:82` returns `q.options` directly (the array) without stringifying, which is inconsistent with what is stored in DB.
**FIX:** Store the array directly: `options: q.options` (Prisma handles JSON serialization). Remove the `JSON.parse` dance on read.

### M5. Sentry example route throws unconditionally -- no guard for production
**FILE:** `src/app/api/sentry-example-api/route.ts:12-17`
**ISSUE:** This route always throws, which will generate Sentry events and error logs in production. If the route is hit by a bot or crawler, it creates noise.
**FIX:** Guard with environment check: only throw in development or behind a query parameter flag.

### M6. `studyAnalyzeAction` filters out questions with no parsed options silently
**FILE:** `src/app/actions/analyze.ts:280`
**ISSUE:** `.filter(q => q.options.length > 0)` silently drops questions where `JSON.parse` failed. If all questions have malformed options (e.g., AI returned unexpected format), the user gets 0 questions with no error message.
**FIX:** Log a warning when questions are filtered out. Return an error to the user if no valid questions remain after filtering.

---

## Low Priority

### L1. Demo user email duplicated across 5 files
**FILE:** `src/app/api/study-session/route.ts:8`, `src/app/api/cards/due/route.ts:8`, `src/app/api/progress/stats/route.ts:8`, `src/app/actions/analyze.ts:90`, `src/app/actions/study-shared.ts:7`
**ISSUE:** `'demo@example.com'` is hardcoded as a string literal in 5 files. When auth is added, every one of these must be found and updated.
**FIX:** Export a constant from `study-shared.ts` (e.g., `DEMO_USER_EMAIL`) and import it everywhere. The `study-shared.ts` already defines this constant -- use it.

### L2. `title` derived from filename without sanitization in upload route
**FILE:** `src/app/api/upload/route.ts:72`
**ISSUE:** `file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')` only strips extension and replaces underscores/hyphens. Other special characters from the filename pass through to the DB and potentially to AI prompts.
**FIX:** Apply basic sanitization (strip non-printable chars, truncate to reasonable length).

### L3. `pdf.ts` `extractTitleFromPDF` uses `replace('.pdf', ...)` which only replaces first occurrence
**FILE:** `src/lib/parsers/pdf.ts:50`
**ISSUE:** `filename.replace('.pdf', '')` only replaces the first `.pdf`. A file named `my.pdf.story.pdf` would become `my.pdf.story`. Minor and unlikely.
**FIX:** Use `filename.replace(/\.pdf$/i, '')` for end-of-string match.

### L4. `formatFileSize` can produce NaN for negative inputs
**FILE:** `src/lib/validation/upload.ts:51-57`
**ISSUE:** `Math.log(0)` returns `-Infinity`, `Math.floor(-Infinity)` returns `-Infinity`, `Math.pow(1024, -Infinity)` returns `0`. `bytes === 0` is handled, but negative values would produce unexpected results. Not a real risk since `file.size` is always non-negative.
**FIX:** Low priority -- add a guard for `bytes < 0` returning `'0 Bytes'` if desired.

---

## Positive Observations

- **Sentry instrumentation is thorough.** Every DB and AI call is wrapped in `startSpan`, breadcrumbs are added at logical boundaries, and error capture includes route tags. This is excellent observability practice.
- **Pino logging with module-specific child loggers** provides good structured logging.
- **Sentry `beforeSend` hook** strips PII (emails, auth headers, cookies, file paths) before sending to Sentry. Well done.
- **Prisma parameterized queries** prevent SQL injection by default.
- **Input validation exists** at the API boundary for file uploads (size, type, text length) and is applied in both client and server.
- **AI fallback strategies** (heuristic CEFR when AI fails, skip simplification, serve original text) make the system resilient to AI API failures.
- **`$force-dynamic`** on the Sentry example route prevents caching issues.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 5 |
| Medium | 6 |
| Low | 4 |

**Top 3 actions to take before next deploy:**
1. Fix the user creation race condition (C1) -- use `upsert` everywhere via `getOrCreateDemoUser()`.
2. Add ID validation to all endpoints accepting `passageId`/`sessionId`/`cardReviewId` (C2).
3. Wrap the delete+create questions in a transaction (H4).

---

## Unresolved Questions

1. Is `analyzeContentAction` still needed, or is it superseded by the split actions (`studyUploadAction` + `studySimplifyAction` + `studyGenerateQuestionsAction`)? If so, it and the upload API routes that call it can be removed.
2. Are the `uploads/content/` files meant to be served back to users, or are they purely temporary? If temporary, they should be deleted after processing. If served, they need an API endpoint and proper serving configuration.
3. Is there a plan to add authentication? The current no-auth design means any visitor shares the same demo user's data. The `study-session PATCH` endpoint (C3) will need immediate attention when auth is added.
