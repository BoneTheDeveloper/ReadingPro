---
phase: 3
title: "Cache-First Quick Translate"
status: pending
priority: P1
effort: "2h"
dependencies:
  - 1
  - 2
---

# Phase 3: Cache-First Quick Translate

## Overview

Align quick translate with issue #57 by verifying cache-first behavior, local dictionary preference, alias reuse, safe-rule fallback, and deterministic fallback for unknown terms.

## Requirements

- Functional: Quick translate checks `TranslationCache` before dictionary work.
- Functional: Dictionary-scope quick translate prefers local `DictionaryEntry` rows, then `DictionaryAlias`, then safe tiny candidate rules.
- Functional: Unknown terms return deterministic fallback without AI.
- Functional: Cache writes persist provider and normalized response shape for repeated requests.
- Non-functional: Cache keys remain hashed and privacy-safe; logs avoid raw selected text and raw context.

## Architecture

Keep `/api/translate` as the orchestration boundary. Reuse the existing `resolveQuickDictionaryTranslation()` for dictionary-scope selections, but ensure it benefits from Phase 1 normalization, richer entries, and alias lookup. Translation cache remains keyed by `buildTranslationCacheKey()` and should be read before resolver calls. MVP quick translate must not call external providers or show deterministic fallback as a confident dictionary meaning.

## Related Code Files

- Modify: `/home/luc/Project/english-reading-training-app/src/app/api/translate/route.ts`
- Modify: `/home/luc/Project/english-reading-training-app/src/lib/dictionary/resolve-quick-dictionary-translation.ts`
- Create/Modify: `/home/luc/Project/english-reading-training-app/src/lib/dictionary/resolve-dictionary-lookup.ts`
- Modify: `/home/luc/Project/english-reading-training-app/src/lib/db/translation-queries.ts`
- Modify: `/home/luc/Project/english-reading-training-app/src/lib/db/dictionary-queries.ts`
- Modify: `/home/luc/Project/english-reading-training-app/src/lib/translation/quick-selection-scope.ts`
- Modify: `/home/luc/Project/english-reading-training-app/docs/API/translation-flow.md`

## Implementation Steps

1. Re-read quick translate flow and confirm cache read happens before dictionary resolver work.
2. Update quick dictionary resolver imports to use shared normalization.
3. Add or reuse shared dictionary lookup helper with order: exact entry -> alias -> safe tiny candidate rules -> deterministic fallback.
4. Use `primaryTranslation` for the quick response and retain alternatives for detailed dictionary page display.
5. Keep deterministic fallback as token translations or normalized selected text.
6. Verify cache write/read paths preserve `provider` values and return `provider: "cache"` only on cache response.
7. Add privacy-safe span/log metadata for cache hit/miss, provider, text length, context length, alias hit flag, and mode.

## Success Criteria

- [ ] Quick translate seed hit returns `provider: "dictionary"`.
- [ ] Quick translate alias hit returns the canonical entry translation.
- [ ] Quick translate safe-rule hit works only for approved conservative candidate rules.
- [ ] Quick translate repeat returns from cache without DB work beyond cache read.
- [ ] Unknown dictionary-scope text returns deterministic fallback without AI.
- [ ] Runtime provider calls are absent from quick translate MVP.
- [ ] Privacy-safe logging tests still pass.

## Risk Assessment

Calling external providers from quick translate would make text selection slow and flaky. For MVP, keep all quick translation dictionary behavior local and deterministic. Alias mistakes are the main correctness risk; mitigate with fixture validation and explicit tests for each alias reason.
