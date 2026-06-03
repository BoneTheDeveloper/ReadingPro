---
phase: 3
title: "Runtime Dictionary and Quick Translate"
status: pending
priority: P1
effort: "4h"
dependencies:
  - 1
  - 2
---

# Phase 3: Runtime Dictionary and Quick Translate

## Overview

Wire the local sense-based dictionary into `/api/dictionary` and dictionary-scope quick translate while preserving cache-first behavior.

## Requirements

- Functional: Resolve exact headword, alias, phrase/candidate, then deterministic miss.
- Functional: Return only `reviewed` or `approved` entries/translations by default.
- Functional: Return bounded DTOs with backend-generated `sourceLabel`; never return raw Prisma rows.
- Functional: Quick translate reads `TranslationCache` before dictionary lookup.
- Functional: Runtime dictionary paths never call providers or LLMs.
- Non-functional: Logs and Sentry spans avoid raw query/context payloads.

## Architecture

`resolveDictionaryLookup()` is the shared lookup path for `/api/dictionary` and quick translate. It loads usage-sorted senses and the primary target translation for each runtime-available sense. The backend maps `sourceType/sourceName` to `sourceLabel` before returning DTOs.

Translation DTO:

```ts
interface DictionaryTranslationDto {
  id: string;
  senseId: string;
  targetLanguage: "vi";
  translation: string;
  isPrimary: boolean;
  rank: number;
  confidence: number | null;
  status: "draft" | "reviewed" | "approved" | "deprecated";
  sourceType: "seed" | "manual" | "provider" | "llm" | "mixed";
  sourceName: string | null;
  reviewedAt: string | null;
  sourceLabel: string;
}
```

## Related Code Files

- Modify: `/home/luc/Project/english-reading-training-app/src/app/api/dictionary/route.ts`
- Modify: `/home/luc/Project/english-reading-training-app/src/app/api/translate/route.ts`
- Create: `/home/luc/Project/english-reading-training-app/src/lib/dictionary/dictionary-dtos.ts`
- Modify: `/home/luc/Project/english-reading-training-app/src/lib/dictionary/resolve-quick-dictionary-translation.ts`
- Modify: `/home/luc/Project/english-reading-training-app/src/lib/dictionary/resolve-dictionary-lookup.ts`
- Modify: `/home/luc/Project/english-reading-training-app/src/lib/db/dictionary-queries.ts`
- Modify: `/home/luc/Project/english-reading-training-app/docs/API/Routes/translation-feature.md`

## Implementation Steps

1. Add shared DTO types and source-label mapping helpers.
2. Update `/api/dictionary` to use `resolveDictionaryLookup()`.
3. Update lookup helpers to enforce status filtering and primary translation selection.
4. Update quick translate to use the shared lookup DTO and deterministic fallback.
5. Keep cache behavior and privacy-safe logging intact.

## Success Criteria

- [ ] Exact, alias, and seeded phrase lookup return found entries.
- [ ] Multiple senses are returned in usage order.
- [ ] Draft/deprecated rows are excluded by default.
- [ ] DTOs include translation provenance and backend `sourceLabel`.
- [ ] Quick translate is cache-first and local-only for dictionary scope.

## Risk Assessment

The main risk is treating fallback text as real dictionary meaning. Keep miss/fallback behavior explicit and deterministic.
