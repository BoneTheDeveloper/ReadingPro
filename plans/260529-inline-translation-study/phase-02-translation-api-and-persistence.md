---
phase: 2
title: "Translation API and Persistence"
status: pending
priority: P1
effort: "5h"
dependencies: [1]
---

# Phase 2: Translation API and Persistence

## Overview

Implement authenticated translation and vocabulary APIs using existing Next.js route, Zod validation, Sentry, logger, AI SDK, Prisma patterns, and a dictionary-first lookup strategy.

## Requirements

- Functional: Add `POST /api/translate` with `quick` and `detailed` modes.
- Functional: Add `POST /api/vocabulary` to save or update a dedicated vocabulary item.
- Functional: Resolve quick translations with exact cache first, dictionary/provider lookup second, and AI fallback only when dictionary confidence is insufficient.
- Functional: Use AI for detailed contextual translation because dictionary data cannot reliably produce passage-specific explanation, sentence translation, and examples.
- Functional: Cache successful translations, cache reusable dictionary entries, and append history records.
- Functional: Seed a small local dictionary for deterministic v1 behavior and tests.
- Non-functional: Authenticate users and verify `sourceId` belongs to the current user before cache lookup or save.
- Non-functional: Treat selected text and context as untrusted AI input via `wrapUserText()`.
- Non-functional: Instrument every API, AI, cache, history, and vocabulary operation with the repo's Sentry + Pino patterns.

## Architecture

`POST /api/translate` request:

```ts
{
  text: string;
  context: string;
  sourceId: string;
  sourceLanguage: "en";
  targetLanguage: "vi";
  mode: "quick" | "detailed";
}
```

Quick response data:

```ts
{
  translation: string;
  type?: string;
  provider: "cache" | "dictionary" | "ai";
}
```

Detailed response data:

```ts
{
  translation: string;
  explanation: string;
  meaningInSentence?: string;
  sentenceTranslation: string;
  examples: string[];
  relatedWords: string[];
  pronunciation?: string;
  type?: string;
  provider: "cache" | "dictionary" | "ai";
}
```

`POST /api/vocabulary` saves:

```ts
{
  sourceId: string;
  selectedText: string;
  translation: string;
  contextSentence: string;
  sourceLanguage: "en";
  targetLanguage: "vi";
  type?: string;
}
```

Observability contract:

- `POST /api/translate` and `POST /api/vocabulary` create request-scoped Pino loggers with `createRequestLogger()` and `createRequestLogContext()`.
- `src/lib/ai/translator.ts` creates a module logger with `createModuleLogger("ai:translator")`.
- `src/lib/dictionary/translation-dictionary.ts` creates a module logger with `createModuleLogger("dictionary:translation")`.
- `src/lib/db/translation-queries.ts` does not create its own request logger; route callers wrap DB calls with Sentry spans and route logs.
- Sentry spans:
  - `api:translate-parse-body`
  - `api:translate-authenticate`
  - `db:translate-source-fetch`
  - `db:translate-cache-fetch`
  - `dictionary:translate-lookup`
  - `ai:translate-generate`
  - `db:dictionary-entry-upsert`
  - `db:translate-cache-upsert`
  - `db:translate-history-create`
  - `api:vocabulary-parse-body`
  - `api:vocabulary-authenticate`
  - `db:vocabulary-source-fetch`
  - `db:vocabulary-upsert`
- Log metadata must include mode, source ID, target language, selected/context lengths, cache hit/miss, dictionary hit/miss/confidence, provider, and user ID after authentication; do not log raw selected text or context.

Seeded dictionary entries:

| Term | Translation | Type | Confidence | Notes |
|------|-------------|------|------------|-------|
| `algorithmic bias` | `thiên lệch thuật toán` | noun phrase | 0.96 | Phrase-level hit for the core example. |
| `algorithm` | `thuật toán` | noun | 0.92 | Single-word dictionary hit. |
| `bias` | `thiên lệch` | noun | 0.76 | Low enough to allow contextual fallback unless context contains `algorithmic bias`. |
| `data` | `dữ liệu` | noun | 0.90 | Common reading vocabulary hit. |
| `evidence` | `bằng chứng` | noun | 0.88 | Common academic vocabulary hit. |

Context rule:

- If selected text is `bias` and the context sentence contains `algorithmic bias`, return the phrase meaning `thiên lệch thuật toán` with provider `dictionary` and high confidence.
- If selected text is absent from the seeded dictionary and DB dictionary cache, quick mode falls back to AI.

## Related Code Files

- Create: `src/lib/ai/translator.ts`
- Create: `src/lib/dictionary/translation-dictionary.ts`
- Create: `src/lib/db/translation-queries.ts`
- Create: `src/app/api/translate/route.ts`
- Create: `src/app/api/vocabulary/route.ts`
- Modify: `src/lib/ai/model-config.ts`

## Implementation Steps

1. Add `getTranslationModelId()` with optional `OPENAI_TRANSLATION_MODEL`, defaulting to existing study chat model fallback.
2. Add Zod schemas and AI functions for quick fallback and detailed contextual translations using `generateObject`.
3. Add dictionary lookup provider with the local seeded entries above first and DB-backed `DictionaryEntry` cache second; return confidence/provider metadata.
4. Add DB helpers for cache key hashing, source ownership checks, cache read/write, dictionary entry upsert, history append, and vocabulary upsert.
5. Implement `POST /api/translate` with request validation, auth, owned-source check, exact cache lookup, dictionary lookup for quick mode, AI fallback when needed, cache write, and history append.
6. Implement detailed mode as cache lookup first, then AI generation, then cache/history write.
7. Implement `POST /api/vocabulary` with validation, auth, owned-source check, and vocabulary upsert.
8. Add Pino warnings for invalid payloads and scoped request info for cache hit/miss, dictionary hit/miss, provider chosen, and successful save.
9. Return repo-standard JSON payloads and capture unexpected errors with route/method Sentry tags.

## Success Criteria

- [ ] Invalid JSON, invalid schema, unauthenticated access, and missing source all return stable JSON errors.
- [ ] Cache hit returns without calling the AI generator.
- [ ] Quick cache miss uses dictionary/provider lookup before calling AI.
- [ ] AI is only called for quick mode when dictionary lookup is unavailable/low-confidence, and for detailed mode after cache miss.
- [ ] Successful dictionary and AI results are stored in exact cache and append history.
- [ ] Seeded entries return deterministic dictionary results without external network calls.
- [ ] Selecting `bias` in a sentence containing `algorithmic bias` returns `thiên lệch thuật toán`, not generic `thiên lệch`.
- [ ] Vocabulary save is idempotent for the same user/source/text/context/target language.
- [ ] Prompt injection protections match existing AI modules.
- [ ] New API routes use request-scoped Pino logs and Sentry spans for parse, auth, DB, cache, AI, and persistence operations.
- [ ] No raw selected text or context is written to logs or Sentry metadata.

## Risk Assessment

The main risks are cost from repeated AI calls, low-quality dictionary matches for contextual phrases, and data leakage through cache keys. Mitigate by checking passage ownership before cache lookup, hashing keys with `userId`, enforcing request length limits, and requiring dictionary confidence/provider metadata before skipping AI.
