# Route Convention Sync Plan

## Overview
Sync all API routes with documented conventions. Fix code deviations and update docs.

## Phases

### Phase 1: Code fixes (parallel)
- **1a** study-results: Extract service to `src/lib/study/passage/study-results-service.ts`, fix response to `{ success: true, data: { results } }`
- **1b** cards/due: `createModuleLogger` → `createRequestLogger`, add `Sentry.startSpan`
- **1c** progress/stats: `createModuleLogger` → `createRequestLogger`, add `Sentry.startSpan`
- **1d** vocabulary/list: Add Zod query param validation, add `Sentry.startSpan`

### Phase 2: Docs (parallel, after phase 1)
- **2a** Create `docs/API/Routes/quiz-attempt-feature.md`
- **2b** Create `docs/API/Routes/study-results-feature.md`
- **2c** Update `docs/API/api-index.md` — add quiz-attempt, study-results, vocabulary sub-routes
- **2d** Update `docs/API/Routes/response-contract-coverage.md` — add missing routes

### Phase 3: Test + Review
- Run compile check
- Run existing tests
- Code review
