---
phase: 2
title: "Migrate write call sites to wrapper"
status: pending
priority: P2
effort: "2h"
dependencies: [1]
---

# Phase 2: Migrate write call sites to wrapper

## Overview

Replace every `await ensureUserProfile(x)` + following write with
`return withUserProfile(x, () => <write>)`. Removes the pre-emptive upsert from the hot
paths; the profile is now created lazily only on a real FK miss.

## Requirements

- Functional: every previously-guarded write still succeeds for existing users (no behavior
  change) and self-heals for brand-new users via the wrapper.
- Non-functional: no pre-emptive `ensureUserProfile` call remains in any production write
  path; steady-state writes issue zero extra round-trips.

## Architecture

Per site, fold any cheap pre-write work (cache-key build, text normalization) into or
before the closure; the closure must contain the actual DB write so a retry re-runs it.

| File | Functions (sites) | Note |
|------|-------------------|------|
| `src/server/db/translation-queries.ts` | `upsertTranslationCache`, `createTranslationHistory`, +1 (`saveVocabularyItem`?) | hot path; writes carry `userId` + `sourceId` FKs |
| `src/server/db/vocabulary-queries.ts` | 1 site (`params.userId`) | |
| `src/server/db/vocabulary-set-queries.ts` | 3 sites | |
| `src/server/db/study-session-queries.ts` | `createStudySession` (simple), `ensureActiveSession` (`$transaction`) | wrap the **whole** `$transaction` call |
| `src/server/modules/upload/passage-create/passage-create.service.ts` | 1 site | |
| `src/app/api/test/translate-performance-fixtures/route.ts` | 1 site | test fixture route |

(Confirm exact site list via `rg "ensureUserProfile" src` — Phase-1 scout counted ~10
production sites; the table is the working list, reconcile during migration.)

Example (translation cache):

```ts
export async function upsertTranslationCache(input: TranslationCacheInput) {
  const cacheKey = buildTranslationCacheKey(input);
  return withUserProfile(input.userId, () =>
    db.translationCache.upsert({ where: { cacheKey }, update: { ... }, create: { ... } }),
  );
}
```

Transactional caller:

```ts
export async function ensureActiveSession(userId: string) {
  const now = new Date();
  return withUserProfile(userId, () =>
    db.$transaction(async (tx) => { /* advisory lock + update-or-create, unchanged */ }),
  );
}
```

## Related Code Files

- Modify: the 5 query/service modules above + the test fixture route.
- Modify: their existing unit tests — drop assertions that `ensureUserProfile` is called on
  the happy path; the happy path must now assert it is NOT called. Where a test simulated a
  missing profile, assert the FK-retry path instead.
- Remove direct `import { ensureUserProfile }` where the site no longer calls it directly
  (it now imports `withUserProfile`).

## Implementation Steps

1. `rg "ensureUserProfile" src -g '!*.test.ts'` → finalize the exact site list.
2. Migrate each site to `withUserProfile`, folding pre-write work appropriately.
3. For `ensureActiveSession`, wrap the entire `$transaction` (not inside it).
4. Update each module's tests: happy path asserts no ensure; add/adjust an FK-retry case
   where one existed.
5. `pnpm run typecheck && pnpm run lint && pnpm run test` green.

## Success Criteria

- [ ] `rg "ensureUserProfile" src -g '!*.test.ts'` shows it only inside `withUserProfile`
- [ ] Every migrated write passes its existing tests (existing-user behavior unchanged)
- [ ] `ensureActiveSession` wraps the whole `$transaction`; advisory-lock behavior intact
- [ ] Happy-path tests assert zero `ensureUserProfile`/profile-upsert calls
- [ ] `pnpm run typecheck`, `lint`, full `test` pass

## Risk Assessment

- Risk: closure misses some pre-write work that has side effects → retry double-runs it.
  Mitigation: keep only pure/cheap setup outside the closure; DB writes inside. Review each
  site.
- Risk: a non-FK error inside `$transaction` now surfaces differently. Mitigation: matcher
  only catches `userId` `P2003`; everything else propagates exactly as before.
- Risk: missed a call site. Mitigation: the `rg` guard in success criteria is the explicit
  check.
