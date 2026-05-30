## Code Review Summary

### Scope
- Files: `src/lib/ai/translator.ts`, `src/app/api/translate/route.ts`, `src/lib/db/dictionary-queries.ts`, `src/lib/dictionary/resolve-quick-dictionary-translation.ts`, `src/lib/dictionary/translation-dictionary.ts`, `prisma/seed-dictionary.ts`
- LOC: ~280 changed (48 removed, ~160 new in resolver, ~72 changed in route)
- Focus: Phase 7 - Quick Translate Contextual Lookup Ranking and Fallback
- Scout findings: substring false-positive in ranking, dead code, missing unit tests

### Overall Assessment

The implementation is well-structured and meets the core goal of removing AI from the quick translate path. The resolver is cleanly separated, ranking logic is correct for the specified acceptance criteria, Sentry spans and Pino logs follow existing patterns, and TypeScript compiles clean. A few issues need attention before merge.

### Acceptance Criteria Verification

| Criterion | Status | Notes |
|-----------|--------|-------|
| No AI import in quick path | PASS | grep confirms zero references to `generateObject`, `openai()`, `generateQuickAiTranslation` in route or resolver |
| `algorithmic bias` returns `thiên lệch thuật toán` | PASS | Exact match rank 2 (high-confidence) will select this. Also a rank-1 contextual phrase if selected text is subterm |
| `bias` in `algorithmic bias` context returns phrase | PASS | Traced ranking: `"algorithmic bias"` entry gets rank 1 (contextual phrase containing selection), beats `"bias"` at rank 2 |
| Standalone `algorithm` returns exact dictionary translation | PASS | Would hit exact match rank 2 (or rank 4 for lower confidence) |
| Unknown phrase returns stable fallback without AI | PASS | `deterministicFallback` joins token translations or returns normalized text |
| Detailed mode still uses AI after cache miss | PASS | Line 161-174 in route: `generateDetailedAiTranslation` unchanged |
| Logs/Sentry without raw text or context | PASS | All log contexts use lengths (`selectedTextLength`, `contextLength`), never raw text |

### Critical Issues

None found.

### High Priority

**H1. Substring false-positive in contextual phrase ranking** (line 143)

`entryTerm.includes(normalizedText)` is a plain substring check with no word-boundary enforcement. If the user selects `"as"` and context contains `"artificial intelligence"`, the entry `"artificial intelligence"` would NOT match (because `"artificial intelligence".includes("as")` is false), but `"bias".includes("as")` IS true, so if there were a dictionary entry with normalizedTerm `"bias"` that happens to be an exact match, it would NOT cause a false contextual phrase match because `containsSelected` requires `isPhrase` (multi-word entry) AND `containsSelected` AND `isInContext`. Since `"bias"` is a single word, `isPhrase` would be false.

However, consider a multi-word entry like `"was found"` and selected text `"as"`. `"was found".includes("as")` is true, and if the context contains `"was found"`, this would get rank 1 as a "contextual phrase containing selection" even though `"as"` is a substring of `"was"`, not a word in `"was found"`.

**Impact**: Rare in practice given current seed data (no entries contain other entries as substrings across word boundaries), but violates the invariant that the phrase should contain the selected word as a standalone token.

**Recommended fix**: Replace `entryTerm.includes(normalizedText)` with token-level containment:

```ts
const containsSelected = entryTerm !== normalizedText
  && entryTokens.some(t => t === normalizedText);
```

This checks that the selected text appears as a complete token within the phrase, not as a substring of another word.

---

**H2. No unit tests for the new resolver**

`resolveQuickDictionaryTranslation` and its helper functions (`buildCandidateTerms`, `rankEntries`, `deterministicFallback`) have zero test coverage. The acceptance criteria are behavioral properties that should be verified by automated tests, not manual tracing. The ranking logic in particular has multiple branches that are easy to break with future changes.

**Recommended fix**: Add unit tests covering at minimum:
- Exact phrase match
- Contextual phrase beats exact word match (the `bias` / `algorithmic bias` scenario)
- Deterministic fallback with token translations
- Deterministic fallback with no token translations
- Unknown phrase returns normalized text

### Medium Priority

**M1. Dead code: `src/lib/dictionary/translation-dictionary.ts`**

`lookupDictionaryTranslation` has zero imports after the route was updated to use the new resolver. The entire file is dead code.

**Recommended fix**: Delete `src/lib/dictionary/translation-dictionary.ts` or mark it as deprecated with a TODO if it will be needed for Phase 6 dictionary page.

---

**M2. Redundant double-normalization in `fetchDictionaryEntriesByTerms`**

`resolveQuickDictionaryTranslation` normalizes the text and context, then passes normalized values through `buildCandidateTerms`. `fetchDictionaryEntriesByTerms` then normalizes them again via `normalizeDictionaryTerm`. The second normalization is a no-op on already-normalized strings, so it is harmless but wasteful.

**Recommended fix**: Accept this as a defensive measure (belt-and-suspenders) or add a comment explaining the intentional double-normalization.

---

**M3. `quickAiTranslationSchema` variable name is stale**

In `src/lib/ai/translator.ts` line 10, the schema is named `quickAiTranslationSchema` but it is no longer used for AI generation -- it is only used as the base for `quickTranslationSchema`. The name is misleading after the Phase 7 change.

**Recommended fix**: Rename to `quickTranslationBaseSchema` or `quickTranslationDataSchema` to reflect that it describes the data shape without AI coupling.

### Low Priority

**L1. Candidate n-gram generation can produce many terms for long contexts**

For a selected word that appears multiple times in a long context, `addNgramsContainingWord` generates 2-4 grams around each occurrence. With `k` occurrences, this produces up to `k * (1 + 2 + 3) = 6k` n-grams. For a 500-word context where a common word appears 20 times, that is 120 candidate terms, which is fine for the DB query (indexed `IN` clause). No action needed, but worth noting if context length limits increase.

---

**L2. `normalizedContext` includes the full request context, not just the surrounding sentence**

The plan mentions "surrounding sentence" but the implementation uses the full `input.context` (up to 4000 chars per the schema). This means n-gram generation spans the entire context paragraph, which could match phrases that are far from the selected text. This is actually more robust than limiting to the immediate sentence, so no fix needed.

### Edge Cases Found by Scout

1. **Substring containment in ranking** (H1 above): `"was found"` matching selected `"as"` as a contextual phrase. Low probability with current seed data, but breaks the invariant.

2. **Empty context edge case**: If `normalizedContext` is empty after normalization (should not happen due to schema `min(1)` validation), `addNgramsContainingWord` would generate no n-grams, and the resolver would fall through to token-level lookup or fallback. This is correct behavior.

3. **Single-character tokens filtered**: `buildCandidateTerms` skips single-character tokens (`token.length > 1`), which prevents looking up `"a"` or `"i"` as individual dictionary entries. These words exist in the seed data but would only match as part of the exact selected text, not as token-level candidates. This is reasonable behavior.

4. **DB query returns all columns**: `fetchDictionaryEntriesByTerms` uses the default `findMany` which returns all columns including `meanings`, `examples`, `relatedWords` (potentially large JSON blobs). The ranking and fallback logic only needs `normalizedTerm`, `translation`, `type`, and `confidence`. A `select` clause would reduce memory and network overhead.

### Positive Observations

1. Clean separation: The resolver is a standalone module with no coupling to the API route or AI SDK.
2. Sentry spans correctly scoped to `dictionary:quick-resolve` with privacy-safe attributes (lengths, not raw text).
3. Pino logs follow existing patterns and avoid leaking raw selected text or context.
4. The `provider` enum change in `quickTranslationSchema` is backward-compatible: cached results with old `provider: "ai"` would fail `safeParse` and be treated as a cache miss (line 138-156 in route), which is correct behavior.
5. Deterministic fallback is intentionally simple and honest: it returns normalized text for truly unknown phrases rather than pretending to translate.

### Recommended Actions

1. **[High]** Fix substring false-positive in `rankEntries` line 143: replace `entryTerm.includes(normalizedText)` with token-level containment check.
2. **[High]** Add unit tests for `resolveQuickDictionaryTranslation` and its helpers, covering the five acceptance criteria scenarios.
3. **[Medium]** Delete or deprecate `src/lib/dictionary/translation-dictionary.ts` (zero imports, dead code).
4. **[Medium]** Rename `quickAiTranslationSchema` to `quickTranslationDataSchema` in translator.ts.
5. **[Low]** Add `select` clause to `fetchDictionaryEntriesByTerms` to limit returned columns.

### Metrics
- Type Coverage: 100% (tsc --noEmit passes clean)
- Test Coverage: 0% for new resolver (no tests exist)
- Linting Issues: 0 (no compilation errors)
- Dead code: 1 file (`translation-dictionary.ts`, 63 lines)

### Unresolved Questions

1. Should `translation-dictionary.ts` be deleted now or preserved for Phase 6 dictionary page implementation? The plan file references `src/lib/dictionary/translation-dictionary.ts` as a file to "Modify" but the implementation replaced it entirely.
2. The plan's success criteria include "Repeating the same unknown quick phrase returns cache provider and does not rerun dictionary/ranking/fallback work." This is implicitly satisfied by the cache-upsert flow in the route (lines 176-200), but there is no explicit test verifying that a second request hits cache. Should a cache-replay test be added?
3. The plan references creating tests "beside the resolver" but no test file was created. Should this be tracked as incomplete in the plan TODO?
