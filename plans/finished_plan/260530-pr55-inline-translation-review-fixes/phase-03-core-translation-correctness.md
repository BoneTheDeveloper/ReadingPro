---
phase: 3
title: "Scope-Aware Quick Translation Correctness"
status: pending
priority: P1
effort: "5h"
dependencies:
  - 2
---

# Phase 3: Scope-Aware Quick Translation Correctness

## Overview

Fix quick translation correctness around punctuation-aware context matching and add scope-aware quick routing: short selections use the dictionary resolver, while sentence/paragraph selections use cache-first non-AI machine translation.

## Main Info

- Problem: Quick translation can miss contextual phrase matches when punctuation is attached to words. It also currently treats sentence/paragraph highlights like dictionary phrases, causing partial one-word output instead of full selected-text translation.
- Resolve: Normalize context tokens before n-gram matching so phrase candidates still match sentence-final or punctuation-adjacent selections. Add a small selection-scope classifier and route quick cache misses for sentence/paragraph selections to a non-AI translation provider, then cache/history the result.

## Requirements

- Functional: Selecting a word adjacent to punctuation in a contextual phrase must still generate the phrase candidate.
- Functional: One word and short phrase selections must continue to use `resolveQuickDictionaryTranslation()` after cache miss.
- Functional: Sentence and paragraph selections must use exact quick translation cache first.
- Functional: Sentence and paragraph quick cache misses must call a non-AI translation provider, initially Google Translate-compatible unless triage selects another provider.
- Functional: Non-AI provider results must be persisted through the existing `TranslationCache` and `TranslationHistory` paths.
- Functional: Existing quick translation ranking order must remain unchanged except for improved token normalization.
- Non-functional: Keep quick mode AI-free. Do not import or call AI SDK generation from the quick path.
- Non-functional: Keep the public `/api/translate` request body unchanged.
- Non-functional: Keep raw selected text/context out of logs and Sentry attributes.
- Non-functional: Avoid schema migrations unless a proven database contract mismatch appears.

## Architecture

Quick translation should normalize context into dictionary tokens before n-gram construction. The API route should then choose the quick resolver branch after cache miss:

```text
POST /api/translate mode=quick
  -> auth + owned source lookup
  -> exact TranslationCache lookup
  -> cache hit: return provider "cache" and append history
  -> cache miss:
      if selection scope is word/short phrase:
        resolveQuickDictionaryTranslation()
      else:
        translateWithNonAiProvider()
  -> upsert TranslationCache
  -> create TranslationHistory
```

Selection scope should be decided by a pure helper, for example `getQuickSelectionScope(text)`, using conservative rules:

- one word and short phrase: dictionary
- sentence-ending punctuation, paragraph/newline, or longer token count: machine translation

The non-AI provider should be behind a server-side helper module so the route owns orchestration only. The quick schema must allow the new provider value, for example `provider: "google_translate"`, while cached responses still return `provider: "cache"`.

This phase must not touch vocabulary persistence.

## Related Code Files

- Modify: `src/app/api/translate/route.ts`
- Modify: `src/lib/ai/translator.ts`
- Modify: `src/lib/dictionary/resolve-quick-dictionary-translation.ts`
- Modify: `src/lib/dictionary/resolve-quick-dictionary-translation.test.ts`
- Create: `src/lib/translation/quick-selection-scope.ts`
- Create: `src/lib/translation/non-ai-translation-provider.ts`
- Create: `src/lib/translation/quick-selection-scope.test.ts`
- Modify: `__tests__/api/translation-vocabulary-routes.test.ts`
- Modify: `__tests__/components/study/study-page-client.integration.test.tsx`
- Modify: `docs/API/Routes/translation-feature.md`
- Modify: `.env.example` if provider configuration uses environment variables

## Implementation Steps

1. Add or update tokenizer logic so contextual n-grams strip punctuation around words while preserving internal apostrophes where appropriate.
2. Add a resolver regression test: selected text `bias`, context containing `algorithmic bias.`, dictionary entries for `bias` and `algorithmic bias`, expected result `thiên lệch thuật toán` from provider `dictionary`.
3. Add a pure quick selection classifier with tests for:
   - `bias` -> dictionary
   - `algorithmic bias` -> dictionary
   - `Key concerns include algorithmic bias in automated hiring systems.` -> machine
   - multi-sentence or newline selection -> machine
4. Add a non-AI provider helper with a narrow interface returning `{ translation, type: null, provider }`. Keep provider-specific parsing and configuration inside this helper.
5. Update quick translation schema/type unions so the new provider value is valid for quick responses.
6. Update `/api/translate` quick cache-miss branch so dictionary scope calls `resolveQuickDictionaryTranslation()` and machine scope calls the non-AI provider helper.
7. Preserve existing cache hit behavior: parsed cached quick responses should be returned as provider `cache`, and cache hits should not call dictionary or non-AI provider.
8. Add API route tests for sentence/paragraph quick translation:
   - cache miss calls the non-AI provider and does not call AI SDK generation
   - repeat request with exact cache hit returns provider `cache` and does not call the non-AI provider
   - provider failure returns the existing `500` API error shape and captures/logs without raw text
9. Verify no raw selected text or context is added to logs or Sentry attributes.

## Success Criteria

- [ ] `bias` in `algorithmic bias.` resolves the phrase translation.
- [ ] One word and short phrase selections still use dictionary/fallback quick resolution.
- [ ] Sentence/paragraph selections use cache first and non-AI provider on cache miss.
- [ ] Repeating an exact sentence/paragraph selection returns provider `cache` and does not re-call the non-AI provider.
- [ ] Quick translation still avoids AI calls in all quick-mode tests.
- [ ] Existing cache/history behavior remains unchanged except for the intentional new provider value.
- [ ] Public `/api/translate` request shape remains unchanged.

## Risk Assessment

Token normalization can affect ranking. Keep the change narrow to candidate generation and add tests for existing exact phrase and fallback behavior to catch unintended ranking changes.

Provider risk is higher than dictionary-only quick mode because an external non-AI service can fail, rate-limit, or change response shape. Keep the provider helper isolated, make provider configuration explicit, and preserve the existing API error shape on provider failure. Do not silently fall back to AI.
