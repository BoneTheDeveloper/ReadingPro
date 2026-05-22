# Phase 3: Services and Server Actions Tests

## Goal

Cover orchestration logic behind upload, study actions, AI generation, storage, DB writes, auth, and Sentry instrumentation.

## Target Files

- `src/features/upload/content-analysis-service.ts`
- `src/features/upload/upload-workflow.ts`
- `src/features/upload/analyze-content-action.ts`
- `src/features/study/services/passage-study-service.ts`
- `src/features/study/actions/study-upload-action.ts`
- `src/features/study/actions/study-delete-passage-action.ts`
- `src/features/study/actions/study-generate-questions-action.ts`
- `src/features/study/actions/study-simplify-action.ts`

## Work Items

1. Test content analysis service happy path: heuristic CEFR, AI-generated questions, passage persistence, question persistence, and returned payload.
2. Test content analysis failures: AI failure, invalid generated questions, DB failure, and Sentry capture/breadcrumb behavior where present.
3. Extend the shared Sentry mock before upload workflow tests so `addBreadcrumb`, `captureException`, `startSpan`, and server action instrumentation assertions are available.
4. Test file upload workflow: validation, non-PDF text extraction, PDF parsing path with parser mock, Supabase upload, signed URL, and cleanup/error handling.
5. Test study service: owned passage lookup, not-found handling, simplification skip rules, simplification persistence, question generation filtering, and pending question mapping.
6. Test server actions: auth success/failure, validation failures, service failures, instrumentation wrapper usage, logger calls, and stable result shapes.
7. Add small mocks for storage/PDF parser modules if the current setup does not already cover them.

## Verification

- No live DB, AI, storage, or Sentry calls.
- Server action tests assert returned objects, not thrown framework internals, unless the action intentionally throws.
- `pnpm test` passes after phase completion.
