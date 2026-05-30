---
phase: 7
title: "Quick Translate Contextual Lookup Ranking and Fallback"
status: completed
priority: P1
effort: "4h"
dependencies: [2, 6]
---

# Phase 7: Quick Translate Contextual Lookup Ranking and Fallback

## Overview

Change quick translate to behave like an instant dictionary/translate surface: no AI call in quick mode, fast contextual lookup, ranked candidate selection, and deterministic fallback generation when no strong dictionary entry exists.

## Requirements

- Functional: Remove `generateQuickAiTranslation()` and any AI SDK dependency from the quick translate path.
- Functional: Keep detailed translation AI-backed after cache miss.
- Functional: Quick mode resolves in this order: exact cache, contextual dictionary lookup, ranked candidates, deterministic fallback generation, cache write, history append.
- Functional: Contextual lookup must detect phrase entries in the surrounding sentence when the selected text is a subterm, such as selected `bias` inside `algorithmic bias`.
- Functional: Ranking must prefer contextual phrase matches over generic single-word matches, then exact selected-text matches, then token-level composed results.
- Functional: Fallback generation must return a stable quick result without external network or AI calls.
- Non-functional: Preserve request auth, source ownership checks, Sentry spans, Pino logs, and privacy-safe metadata.

## Architecture

Quick mode should use a dedicated resolver, for example `resolveQuickDictionaryTranslation()`, that accepts selected text, context, source language, and target language.

Resolution pipeline:

```text
selected text + context
  -> normalize selected text and context
  -> build candidate terms
     - exact selected text
     - dictionary phrases from context that contain the selected text
     - nearby n-grams around the selected text
     - token-level dictionary entries
  -> fetch dictionary entries by normalized keys/terms
  -> rank candidates
     - contextual phrase containing selection
     - exact phrase selection
     - high-confidence exact selected term
     - composed token translation
     - deterministic fallback
  -> return QuickTranslation provider: "dictionary" | "fallback"
```

Quick response data should no longer allow `provider: "ai"` before cache write:

```ts
{
  translation: string;
  type: string | null;
  provider: "cache" | "dictionary" | "fallback";
}
```

Detailed response data can keep `provider: "cache" | "ai"`.

Fallback generation should be deliberately simple for v1:

- If token-level dictionary entries exist, join their Vietnamese translations in source order and return `provider: "fallback"`.
- If no token-level entries exist, return the normalized selected text as a stable fallback with `type: null` and `provider: "fallback"`.
- Do not call AI, remote dictionary services, or translation APIs from quick mode.

## Related Code Files

- Modify: `src/app/api/translate/route.ts`
- Modify: `src/lib/dictionary/translation-dictionary.ts`
- Modify: `src/lib/db/translation-queries.ts`
- Modify: `src/lib/ai/translator.ts`
- Modify/Create: tests under `__tests__/api` and dictionary resolver tests beside the resolver
- Modify: `docs/API/overview.md` or create `docs/API/translation-flow.md`

## Implementation Steps

1. Split quick and detailed provider schemas so quick mode excludes `provider: "ai"` and includes `provider: "fallback"`.
2. Remove `generateQuickAiTranslation()` from the quick route flow and keep AI generation only for detailed mode.
3. Add dictionary query helpers that can fetch multiple normalized terms/keys for contextual candidate ranking.
4. Implement candidate generation from selected text and context sentence, including phrase candidates that contain the selected text.
5. Implement ranking so contextual phrase matches beat generic selected-word matches.
6. Implement deterministic fallback generation for quick misses.
7. Update Sentry spans/log metadata from `ai:translate-generate` to dictionary/ranking/fallback spans for quick mode.
8. Cache quick dictionary and fallback results with the existing exact cache key.
9. Append history for quick dictionary/fallback/cache results without logging raw text or context.

## Success Criteria

- [x] Quick mode has no import or call path to `generateObject`, `openai()`, or `generateQuickAiTranslation()`.
- [x] Selecting `algorithmic bias` returns `thiên lệch thuật toán` from dictionary ranking.
- [x] Selecting `bias` in a sentence containing `algorithmic bias` returns `thiên lệch thuật toán`, not generic `thiên lệch`.
- [x] Selecting a known standalone word such as `algorithm` returns the exact dictionary translation.
- [x] Selecting an unknown quick phrase such as `quorvex drift` returns a stable fallback result without AI.
- [x] Repeating the same unknown quick phrase returns cache provider and does not rerun dictionary/ranking/fallback work.
- [x] Detailed mode still uses AI after cache miss.
- [x] Logs and Sentry spans show cache, dictionary lookup, ranking, fallback, cache write, and history append without raw selected text or context.

## Risk Assessment

The main risk is pretending deterministic fallback is as good as real machine translation. Keep fallback visibly simple in the implementation and tests, and reserve richer contextual explanation for detailed mode where AI is still allowed.

## Future Data Model Note

The current `DictionaryEntry` model stores one primary translation per normalized term/language pair. It can represent alternate meanings only loosely through JSON fields. A future implementation should add a `DictionarySense` child model so entries like `scale`, `bias`, or `complex` can store multiple parts of speech and multiple meanings within the same part of speech. Quick lookup should then rank senses against the surrounding context before returning a translation.
