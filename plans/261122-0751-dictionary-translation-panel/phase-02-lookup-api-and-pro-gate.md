---
phase: 2
title: "Server: dictionary lookup, word-lookup API, Pro gate"
status: completed
priority: P1
effort: "1d"
dependencies: [1]
---

# Phase 2: Server: dictionary lookup, word-lookup API, Pro gate

## Goal

Resolve a selected word to a dictionary entry without AI, record and serve
per-passage lookup rows, and restrict `/api/translate` to signed-in Pro users.

## Files to Create / Modify

- Create: `src/shared/plan/tier.ts` with `PRO_TIER` and `isProTier(tier)`
- Modify: `src/shared/vocabulary/set-schema.ts` (remove `PRO_TIER`), and
  `src/server/modules/vocabulary/sets/vocabulary-set-service.ts` plus
  `src/client/features/vocabulary/components/vocabulary-set-list.tsx`
  (switch to `isProTier`)
- Create: `src/server/modules/dictionary/dictionary-repository.ts`,
  `dictionary-service.ts`, `dictionary-service.test.ts`, `index.ts`
- Create: `src/server/modules/word-lookup/word-lookup-repository.ts`,
  `word-lookup-service.ts`, `word-lookup-routes.ts`,
  `word-lookup-service.test.ts`, `index.ts`
- Modify: `src/shared/dictionary/schema.ts` (lookup input, row and detail
  schemas)
- Modify: `src/shared/api-error.ts` (add `dictionary.not_found` 404 and
  `word_lookup.not_found` 404), `src/client/lib/api/error-message.ts` (add
  Vietnamese copy for both)
- Modify: `src/server/modules/translate/translate-routes.ts` (session and Pro
  gate), `src/server/app.ts` (mount `/word-lookup`)
- Create: `src/server/modules/translate/translate-routes.test.ts`
- Modify: `package.json` (add `wink-lemmatizer`)

## Tasks & Steps

1. **Tier helper.**
   - Put `isProTier(tier: string | null | undefined): boolean` in
     `src/shared/plan/tier.ts`.
   - Replace the current `user.tier !== PRO_TIER` check and the client import.
     Behavior stays the same.
2. **Lemmatizer.**
   - Run `pnpm view wink-lemmatizer version license` and confirm the package
     is MIT and maintained.
   - Add it with `pnpm add wink-lemmatizer`. Add a local `.d.ts` only if the
     package ships no types.
   - If it is unsuitable, use a small local suffix-rule function
     (`-ies`→`y`, `-es`, `-s`, `-ied`, `-ed`, `-ing` with e-restore and
     double-consonant collapse) instead.
3. **Dictionary repository and service.**
   - Repository: `findEntries(headwords: string[], db = pool)` runs
     `SELECT ... WHERE "headword" = ANY($1)`.
   - Service: `resolveEntries(word)` builds the surface forms (lowercased,
     plus the form without a trailing `'s`) and the base forms (verb, noun,
     adjective), runs one query, and returns at most two entries: the surface
     entry (`match: "surface"`) and the first existing base form that differs
     from it (`match: "lemma"`). An empty array means not found.
   - Export `resolveEntries` from the module's `index.ts`.
4. **Word-lookup repository.**
   - `upsertLookup({ userId, passageId, headword, selectedText, contextSentence })`:
     `INSERT ... ON CONFLICT ("passageId","headword") DO UPDATE SET "lookedUpAt" = CURRENT_TIMESTAMP, "selectedText" = EXCLUDED."selectedText", "contextSentence" = COALESCE(EXCLUDED."contextSentence", "WordLookup"."contextSentence") RETURNING *`.
   - `listLookups(userId, passageId)` returns rows ordered by `lookedUpAt`
     DESC, each with the first meaning as a subtitle via a JSONB path on a
     `LEFT JOIN "DictionaryEntry"`.
   - `findLookup(userId, id)`.
   - `deleteLookup(userId, id)` returns a boolean.
5. **Word-lookup service and routes.** All routes sit behind `requireSession`.
   - `POST /api/word-lookup { passageId, word, context? }`:
     - Call `requireOwnedPassage` first.
     - Call `resolveEntries`. If it returns nothing, throw
       `dictionary.not_found` and write nothing.
     - Otherwise upsert with the first entry's headword and return 201 with
       `{ lookup, entries }`.
   - `GET /api/word-lookup?passageId=` returns the list.
   - `GET /api/word-lookup/:id` returns `{ lookup, entries }`, resolved
     again from the stored `selectedText`. An empty array means the
     dictionary has since been reimported without that word.
   - `DELETE /api/word-lookup/:id` returns 204, or `word_lookup.not_found`.
   - Validate the input with zod: `word` uses the same rules as
     `TranslateInputSchema.word`, and `context` is at most 1000 characters.
6. **Translate gate.**
   - `translateRoutes` becomes `Hono<AuthEnv>` with `.use(requireSession)`
     and a `requirePro` check that throws `plan.pro_required` when
     `!isProTier(c.var.user.tier)`.
   - The client only shows translate for Pro (phase 4), so this is
     defense in depth.
7. **Tests.** They run against the real local database.
   - Dictionary tests run inside one transaction that is rolled back.
     Repository functions take a `Queryable`. Seed `run`, `go` and `study`,
     then assert that `went` and `studies` resolve to the base form, that
     `running` returns `running` then `run`, and that `qzxv` returns nothing.
   - Word-lookup tests use `createTestUser` and the passage helpers in
     `src/server/test/`. They assert:
     - a found word creates one row;
     - a repeat lookup keeps one row and moves `lookedUpAt` forward;
     - a not-found word throws `dictionary.not_found` and writes no row;
     - another user's passage throws `passage.not_found`;
     - deleting a passage cascades to its lookups;
     - deleting a lookup with an unknown id throws `word_lookup.not_found`.
   - Translate route tests use `app.request("/api/translate", ...)` without a
     cookie and expect 401. The FREE-user 403 is covered by a unit test of
     the `requirePro` guard function. No AI call is made in tests.

## Verification

- `pnpm test src/server/modules/dictionary src/server/modules/word-lookup src/server/modules/translate src/server/modules/vocabulary`
- `pnpm typecheck && pnpm lint`
- `curl -i -X POST localhost:3001/api/translate` returns 401.

## Risks / Rollback

- Lemmatizer gaps on irregular forms: the fallback is the surface form, and
  the user can still use the external translators. Rollback is reverting the
  module; nothing else depends on it until phase 3.
