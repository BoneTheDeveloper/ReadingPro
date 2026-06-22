# Test Scenarios

**English Reading Training App**

Given/When/Then catalog keyed `TS-xx`, each mapped to a user story
([../Requirements/user-stories/README.md](../Requirements/user-stories/README.md)) and use case
([../Requirements/use-cases.md](../Requirements/use-cases.md)).
The "Covering test" column references a real file under `tests/` or `src/**`; a row
with no real covering file is marked **GAP** and must not be claimed as covered.

| Scenario | Type | Given | When | Then | US / UC | Covering test |
|----------|------|-------|------|------|---------|---------------|
| TS-01 | happy | a signed-in user with valid English text | they submit `POST /api/upload/text` | 200 with `{ success: true, data: { passageId, … } }`; passage + CEFR metadata + questions persisted | US-01 / UC-01 | `tests/vitest/integration/api/upload-routes.test.ts`, `tests/vitest/integration/services/upload-workflow.test.ts` |
| TS-02 | error | text shorter/longer than limits | they submit `POST /api/upload/text` | 400 `{ error }` envelope; passage not created | US-01 / UC-01 | `src/contracts/upload/upload-validation.test.ts` |
| TS-03 | edge | raw passage text with ambiguous level | CEFR detection runs | a CEFR level is returned via AI; if AI unavailable heuristic fallback is used | US-01 / UC-01 | `src/contracts/domain/cefr.test.ts`, `tests/vitest/integration/services/content-analysis-service.test.ts` |
| TS-04 | happy | a signed-in user with a valid PDF file | they submit `POST /api/upload` | 200 with `{ success: true, data: { passageId, … } }`; file stored, text extracted, passage created | US-02 / UC-01 | `tests/vitest/integration/api/upload-routes.test.ts`, `src/server/storage/blob-storage.test.ts` |
| TS-05 | happy | a passage with original + simplified content | the reader renders | 200; line-numbered text and a working simplified toggle are shown | US-06 / UC-02 | `src/contracts/reading-utils.test.ts`, `tests/vitest/integration/services/passage-study-service.test.ts` |
| TS-06 | happy | a passage with generated questions | the user answers and checks | correct/incorrect feedback with source citation returned | US-07 / UC-03 | `src/features/study/ui/studio/quiz/quiz-content.test.tsx` |
| TS-07 | happy | a completed question set | the test finishes | score summary (correct/incorrect counts, streak) is returned | US-08 / UC-03 | `src/features/study/ui/studio/quiz/quiz-results.test.tsx` |
| TS-08 | happy | a vocabulary item with status NEW/LEARNING and a correct review result | review is submitted | status advances (NEW→LEARNING→MASTERED) and `nextReviewAt` is rescheduled via `simpleSchedule` | US-19 / UC-04 | `src/server/modules/spaced-repetition/scheduler.test.ts` (logic only; route = GAP) |
| TS-09 | happy | a signed-in user starting a study session | `POST /api/study/sessions` is called | 200; StudySession record persisted and session ID returned | US-18 / UC-04 | `tests/vitest/integration/api/study-session-route.test.ts`, `src/server/db/study-session-queries.test.ts` |
| TS-10 | happy | a visitor on a protected route | they authenticate via Clerk | identity syncs to local DB and they reach the original route | US-20 / UC-05 | `src/server/auth/auth-utils.test.ts`, `src/server/auth/auth-helpers.test.ts` |
| TS-11 | happy | an authenticated session | the user signs out | auth state clears and they are redirected to sign-in | US-21 / UC-06 | **GAP** (no automated sign-out test) |
| TS-12 | happy | a user with review history | they open the dashboard | 200; streak, time-studied, and active-days stats rendered | US-22 / UC-07 | `tests/vitest/integration/components/progress/progress-dashboard.integration.test.tsx` |
| TS-13 | happy | the study workspace | panels are resized and content uploaded | layout persists; content/quiz panels populate; studio artifacts returned | US-09 / UC-08 | `src/features/study/hooks/use-study-panel-layout.test.ts`, `src/features/study/hooks/use-study-workspace-state.test.ts`, `tests/vitest/integration/components/study/study-page-client.integration.test.tsx`, `src/server/modules/study/passage/studio-artifacts-service.test.ts` (logic only; route = GAP) |
| TS-14 | happy | an owned passage and a valid selection | `POST /api/translate` is called | 200 with translation result; cache entry and history record created | US-12 / UC-09 | `tests/vitest/integration/api/translation-vocabulary-routes.test.ts`, `src/server/modules/translation/translation-provider.test.ts` |
| TS-15 | error | a selection exceeding limits or an unowned passage | `POST /api/translate` is called | 400 or 401/403 `{ error }` envelope; no translation performed | US-12 / UC-09 | `src/contracts/translation/translation-limits.test.ts`, `src/server/modules/translation/quick-selection-scope.test.ts` |
| TS-16 | happy | a selected term and translation | `POST /api/vocabulary` is called | 200; entry upserted by stable key without duplicating | US-15 / UC-10 | `tests/vitest/integration/api/vocabulary-save-route.test.ts`, `tests/vitest/integration/api/vocabulary-list-route.test.ts` |
| TS-17 | happy | saved vocabulary | set create/update/delete and item add/remove are called | sets and items mutate correctly; 200 or 204 responses | US-16 / UC-10 | `tests/vitest/integration/api/vocabulary-set-list-create-routes.test.ts`, `tests/vitest/integration/api/vocabulary-set-item-routes.test.ts`, `tests/vitest/integration/api/vocabulary-set-update-delete-routes.test.ts` |
| TS-18 | happy | vocabulary status/delete operations | `PATCH /api/vocabulary/[id]/status` or `DELETE /api/vocabulary/[id]` is called | 200; item status updated or item removed | US-15 / UC-10 | `tests/vitest/integration/api/vocabulary-status-and-delete-routes.test.ts` |
| TS-19 | happy | a seeded dictionary | lookup/search/suggest/entry-detail routes are queried | 200; matching entries returned, grouped by headword | US-14 / UC-11 | `tests/vitest/integration/api/dictionary-lookup-route.test.ts`, `tests/vitest/integration/api/dictionary-search-route.test.ts`, `tests/vitest/integration/api/dictionary-suggest-route.test.ts`, `tests/vitest/integration/api/dictionary-entry-detail-route.test.ts` |
| TS-20 | happy | dictionary service queries | lookup/search/suggest/entry-detail services run | normalized matching and grouping behave correctly | US-14 / UC-11 | `src/server/modules/dictionary/lookup/lookup.service.test.ts`, `src/server/modules/dictionary/search/search.service.test.ts`, `src/server/modules/dictionary/suggest/suggest.service.test.ts`, `src/server/modules/dictionary/entry-detail/entry-detail.service.test.ts` |
| TS-21 | happy | an owned passage and a tutor question | `POST /api/study/studio/chat` is called | streaming response with message content; assistant message persisted; history retrievable via GET | US-10 / UC-12 | `tests/vitest/integration/api/study-chat-route.test.ts`, `tests/vitest/integration/components/study/study-chat-panel.integration.test.tsx` |
| TS-22 | happy | an owned passage | `POST /api/study/studio/questions` is called | 200; questions generated and persisted against the passage | US-07 / UC-03 | `tests/vitest/integration/api/studio-questions-route.test.ts` |
| TS-23a | happy | a valid Clerk `user.created` or `user.updated` webhook with correct signature | `POST /api/webhooks/clerk` is called | 200; `syncUser` called with mapped fields; local profile upserted | US-20 / UC-05 | `src/app/api/webhooks/clerk/route.test.ts` |
| TS-23b | error | a Clerk webhook request with an invalid signature | `POST /api/webhooks/clerk` is called | 400; no sync performed | US-20 / UC-05 | `src/app/api/webhooks/clerk/route.test.ts` |
| TS-24a | happy | a passage without simplified content | `POST /api/study/passages/[id]/simplify` is called | simplification runs; simplified text persisted; 200 with `{ success: true, data: { … } }` | US-06 / UC-02 | `tests/vitest/integration/api/passage-simplify-route.test.ts` |
| TS-24b | edge | a passage whose CEFR level is already the simplest | `POST /api/study/passages/[id]/simplify` is called | 200 with `{ success: true, data: { skipped: true } }`; no AI call made | US-06 / UC-02 | `tests/vitest/integration/api/passage-simplify-route.test.ts` |
| TS-25 | happy | a quiz completed for a studio artifact | `POST /api/study/studio/artifacts/[id]/quiz-result` is called | quiz result upserted; accuracy computed; artifact updated | US-07 / UC-03 | `tests/vitest/integration/api/studio-artifacts-routes.test.ts` |
| TS-26 | happy | a signed-in user submitting a vocabulary review result | `POST /api/vocabulary/[id]/review` is called | 200; scheduler advances status and updates `nextReviewAt` | US-19 / UC-04 | `tests/vitest/integration/api/vocabulary-review-route.test.ts` |

## Notes

- **GAP** rows have no automated coverage and represent genuine test debt, not invented coverage.
- TS-08 is covered at the scheduler logic level only; the HTTP route `POST /api/vocabulary/[id]/review` is covered by `vocabulary-review-route.test.ts` (TS-26).
- TS-11: sign-out exercised only manually via Clerk; no Vitest or Playwright spec asserts the redirect.
- TS-24a, TS-24b: passage simplify HTTP route is covered by `passage-simplify-route.test.ts`.
- TS-25: quiz-result HTTP route is covered by `studio-artifacts-routes.test.ts`.
