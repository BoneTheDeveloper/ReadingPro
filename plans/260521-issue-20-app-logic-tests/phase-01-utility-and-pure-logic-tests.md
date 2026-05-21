# Phase 1: Utility and Pure Logic Tests

## Goal

Add focused unit tests for deterministic application logic before testing higher-level workflows.

## Target Files

- `src/lib/shared/reading-utils.ts`
- `src/lib/domain/cefr.ts`
- `src/lib/algorithms/sm2.ts`
- `src/lib/validation/upload.ts`
- `src/lib/auth/redirects.ts`
- `src/lib/auth/auth-cache.ts`
- `src/lib/auth/sync-user.ts`
- `src/lib/ai/prompt-utils.ts`
- `src/lib/db/card-review-queries.ts`
- `src/lib/db/passage-queries.ts`
- `src/lib/db/study-session-queries.ts`
- `src/lib/ui/cefr-style.ts`

## Work Items

1. Add tests for reading utilities: challenging-word detection, paragraph parsing, reading-time calculation, empty input, unknown levels, punctuation, and whitespace.
2. Add tests for CEFR helpers: labels, target levels, simplifiable levels, heuristic detection boundaries, and style lookup.
3. Add tests for SM2 helpers: new/known card scheduling, low-quality reset behavior, rating suggestions, due checks, and card status buckets.
4. Add tests for upload validation helpers: file size, MIME type, text length, title sanitization, filename sanitization, and file size formatting.
5. Add tests for auth redirect/cache/sync helpers: safe next paths, origin normalization, cache hit/miss/expiry, and DB upsert shape.
6. Add tests for DB query helpers with `__tests__/mocks/db.ts`: query filters, soft-delete handling, update/create payloads, study-session accuracy, progress stats, and error propagation.
7. Add or export minimal test-only helpers only if repeated setup becomes difficult to read.

## Verification

- `pnpm test`
- Utility/core module coverage improves without adding brittle implementation assertions.
