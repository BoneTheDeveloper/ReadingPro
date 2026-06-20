# Test Scenarios

**English Reading Training App**

Given/When/Then catalog keyed `TS-xx`, each mapped to a user story
([../Requirements/user-stories/README.md](../Requirements/user-stories/README.md)) and use case
([../Requirements/use-cases.md](../Requirements/use-cases.md)).
The "Covering test" column references a real file under `tests/` or `src/**`; a row
with no real covering file is marked **GAP** and must not be claimed as covered.

| Scenario | Given | When | Then | US / UC | Covering test |
|----------|-------|------|------|---------|---------------|
| TS-01 | a signed-in user with valid English text | they submit `POST /api/upload/text` | a passage with CEFR metadata and questions is created | US-01 / UC-01 | `tests/vitest/integration/api/upload-routes.test.ts`, `tests/vitest/integration/services/upload-workflow.test.ts` |
| TS-02 | text shorter/longer than limits | they submit upload | validation rejects with an error | US-01 / UC-01 | `src/contracts/upload/upload-validation.test.ts` |
| TS-03 | raw passage text | CEFR detection runs | a level is returned via AI or heuristic fallback | US-01 / UC-01 | `src/contracts/domain/cefr.test.ts`, `tests/vitest/integration/services/content-analysis-service.test.ts` |
| TS-04 | a signed-in user with a PDF file | they submit `POST /api/upload` | the file is stored, text extracted, and a passage created | US-02 / UC-01 | `tests/vitest/integration/api/upload-routes.test.ts`, `src/server/storage/blob-storage.test.ts` |
| TS-05 | a passage with original + simplified content | the reader renders | line-numbered text and a working simplified toggle are shown | US-06 / UC-02 | `src/contracts/reading-utils.test.ts`, `tests/vitest/integration/services/passage-study-service.test.ts` |
| TS-06 | a passage with generated questions | the user answers and checks | correct/incorrect feedback with source citation is shown | US-07 / UC-03 | `src/features/study/ui/studio/quiz/quiz-content.test.tsx` |
| TS-07 | a completed question set | the test finishes | a score summary (correct/incorrect, streak) is shown | US-08 / UC-03 | `src/features/study/ui/studio/quiz/quiz-results.test.tsx` |
| TS-08 | due cards and a recall rating 0-5 | review is submitted | SM-2 interval, easeFactor, and nextReviewDate are updated | US-19 / UC-04 | `src/server/modules/spaced-repetition/scheduler.test.ts` |
| TS-09 | a study session lifecycle | session create/complete is called | StudySession and quiz attempt records persist correctly | US-18 / UC-04 | `tests/vitest/integration/api/study-session-route.test.ts`, `src/server/db/study-session-queries.test.ts` |
| TS-10 | a visitor on a protected route | they authenticate via Clerk | identity syncs to local DB and they reach the original route | US-20 / UC-05 | `src/server/auth/auth-utils.test.ts`, `src/server/auth/auth-helpers.test.ts` |
| TS-11 | an authenticated session | the user signs out | auth state clears and they are redirected to sign-in | US-21 / UC-06 | **GAP** (no automated sign-out test) |
| TS-12 | a user with review history | they open the dashboard | total/mature/due/today stats render | US-22 / UC-07 | `tests/vitest/integration/components/progress/progress-dashboard.integration.test.tsx` |
| TS-13 | the study workspace | panels are resized and content uploaded | layout persists and content/quiz panels populate | US-09 / UC-08 | `src/features/study/hooks/use-study-panel-layout.test.ts`, `src/features/study/hooks/use-study-workspace-state.test.ts`, `tests/vitest/integration/components/study/study-page-client.integration.test.tsx` |
| TS-14 | an owned passage and a valid selection | `POST /api/translate` is called | a translation returns and cache/history are recorded | US-12 / UC-09 | `tests/vitest/integration/api/translation-vocabulary-routes.test.ts`, `src/server/modules/translation/translation-provider.test.ts` |
| TS-15 | a selection exceeding limits or unowned passage | translate is called | the request is rejected | US-12 / UC-09 | `src/contracts/translation/translation-limits.test.ts`, `src/server/modules/translation/quick-selection-scope.test.ts` |
| TS-16 | a selected term and translation | `POST /api/vocabulary` is called | the entry upserts by stable key without duplicating | US-15 / UC-10 | `tests/vitest/integration/api/vocabulary-save-route.test.ts`, `tests/vitest/integration/api/vocabulary-list-route.test.ts` |
| TS-17 | saved vocabulary | set create/update/delete and item add/remove are called | sets and items mutate correctly | US-16 / UC-10 | `tests/vitest/integration/api/vocabulary-set-list-create-routes.test.ts`, `tests/vitest/integration/api/vocabulary-set-item-routes.test.ts`, `tests/vitest/integration/api/vocabulary-set-update-delete-routes.test.ts` |
| TS-18 | vocabulary status/delete operations | `PATCH /status` or `DELETE /[id]` is called | item status updates or the item is removed | US-15 / UC-10 | `tests/vitest/integration/api/vocabulary-status-and-delete-routes.test.ts` |
| TS-19 | a seeded dictionary | lookup/search/suggest/entry-detail routes are queried | matching entries return, grouped by headword | US-14 / UC-11 | `tests/vitest/integration/api/dictionary-lookup-route.test.ts`, `dictionary-search-route.test.ts`, `dictionary-suggest-route.test.ts`, `dictionary-entry-detail-route.test.ts` |
| TS-20 | dictionary service queries | lookup/search/suggest/entry-detail services run | normalized matching and grouping behave correctly | US-14 / UC-11 | `src/server/modules/dictionary/lookup/lookup.service.test.ts`, `search/search.service.test.ts`, `suggest/suggest.service.test.ts`, `entry-detail/entry-detail.service.test.ts` |
| TS-21 | an owned passage and a tutor question | `POST /api/study/studio/chat` is called | recent messages + context load, a response streams, answer persists | US-10 / UC-12 | `tests/vitest/integration/api/study-chat-route.test.ts`, `tests/vitest/integration/components/study/study-chat-panel.integration.test.tsx` |
| TS-22 | generated studio questions | `POST /api/study/studio/questions` is called | questions generate against the passage | US-07 / UC-03 | `tests/vitest/integration/api/studio-questions-route.test.ts` |

## Notes

- **GAP** rows have no automated coverage and represent real test debt, not invented coverage.
- Sign-out (TS-11) is currently exercised only manually / via Clerk; no Vitest or Playwright
  spec asserts the redirect.
