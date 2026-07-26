---
title: "Phase 2: Provider + Caching Layer"
status: pending
priority: P1
effort: 4h
dependencies: []
---

# Phase 2: Provider + Caching Layer

## Overview

Replace the dead `executeTranslate` pipeline with a thin provider module + a process-scoped in-memory LRU. Inline translate stops touching the database; the cache key is `normalize(text)`. The provider returns a `TranslationDto` whose `type` (POS) and `ipa` are placeholders that will be filled by a future dict endpoint.

## Requirements

- Functional
  - `POST /api/translate` accepts `{ text, context, sourceId, sourceLanguage: "en", targetLanguage: "vi" }` and returns `{ translation, type: null, ipa: null, provider: "google_translate" }`.
  - Provider parses `translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=...` JSON.
  - Normalize once: lowercase + trim + collapse whitespace.
- Non-functional
  - LRU cache: ≤500 entries, 24h TTL, key = `normalize(text)`. No per-user data.
  - 5s `AbortController` timeout; one retry on 5xx or network error with backoff capped at 1s.
  - Provider failures surface as `{ translation: null }` (HTTP 200 OK) so the popup renders the "Not found" state.

## Architecture

```
Client → /api/translate
   │  Zod translateRequestSchema (existing)
   ▼
executeTranslate(input)
   │  normalize(text)
   ▼
translationCache.get(key)        ──► cache hit → return
   │
   ▼ (miss)
translateWithGoogle(input)       ──► fetch translate.googleapis.com → { translation }
   │
   ▼
translationCache.set(key, value)
   │
   ▼
Response.json({ translation, type: null, ipa: null, provider: "google_translate" })
```

- New file: `src/features/reading/server/lib/google-translate.ts` — `translateWithGoogle(input): Promise<string | null>`.
- New file: `src/features/reading/server/lib/translation-cache.ts` — small LRU (Map + TTL expiry, no external dependency).
- Rewrite: `src/features/reading/server/services/inline-translate.ts` — `executeTranslate(input, ctx)` returns either a result or `{ ok: false, status: 404 }`. Drops all cache/history imports.
- Update: `src/features/reading/schemas/translation.ts` — add `ipa: string | null` to `TranslationDto`. Keep `type` for now (popup will ignore it).
- Delete: `src/features/reading/server/db/inline-translate.ts`, `src/features/reading/server/db/translation.ts`, `src/features/reading/lib/text-utils.ts`.

## Related Code Files

Refer to the top-level **File Inventory** for full action+reason. This phase owns:

- create: `src/features/reading/server/lib/google-translate.ts`
- create: `src/features/reading/server/lib/translation-cache.ts`
- rewrite: `src/features/reading/server/services/inline-translate.ts`
- rewrite: `src/features/reading/schemas/translation.ts`
- rewrite: `src/app/api/translate/route.ts`
- delete: `src/features/reading/server/db/inline-translate.ts`
- delete: `src/features/reading/server/db/translation.ts`
- modify: `src/features/reading/lib/text-utils.ts`
- modify: `src/features/reading/lib/selection-utils.ts`

Before writing, open the original files only as **reference**; new code lives in the file, not in a patch.

## Implementation Steps

1. Implement `google-translate.ts`:
   ```ts
   const ENDPOINT = "https://translate.googleapis.com/translate_a/single";
   export async function translateWithGoogle(input: {
     text: string; sourceLanguage: "en" | "vi"; targetLanguage: "en" | "vi";
   }): Promise<string | null> {
     const url = `${ENDPOINT}?client=gtx&sl=${input.sourceLanguage}&tl=${input.targetLanguage}&dt=t&q=${encodeURIComponent(input.text)}`;
     // fetch with AbortController 5s timeout, 1 retry on 5xx/network
     // parse the nested array; return first non-empty translation string
     // return null on any failure
   }
   ```
2. Implement `translation-cache.ts`:
   ```ts
   const MAX_ENTRIES = 500;
   const TTL_MS = 24 * 60 * 60 * 1000;
   type Entry = { translation: string; ipa: string | null; expiresAt: number };
   const store = new Map<string, Entry>();
   export function getCachedTranslation(key: string): Entry | null { … }
   export function setCachedTranslation(key: string, translation: string, ipa: string | null): void { … }
   ```
3. Rewrite `executeTranslate`:
   - normalize = `text.toLowerCase().trim().replace(/\s+/g, " ")`
   - cache get → return if hit
   - call `translateWithGoogle`; on null return `{ ok: false, status: 404 }`
   - cache set, return `{ ok: true, data: { translation, type: null, ipa: null, provider: "google_translate" } }`
4. Relax `route.ts` so a 404 result still returns 200 with `{ translation: null }`; the popup reads this as the "Not found" state.

## Success Criteria

- [ ] `pnpm typecheck` green.
- [ ] `pnpm lint` green.
- [ ] `curl POST /api/translate` with a single English word returns the Vietnamese translation; a second call with the same word shows zero additional network traffic in the dev network panel.
- [ ] `curl POST /api/translate` with a nonsense string returns `{ translation: null, type: null, ipa: null, provider: "google_translate" }` with HTTP 200.

## Risk Assessment

- LRU without eviction on TTL only evicts when access crosses `MAX_ENTRIES`. Fine for MVP since the user base is small.
- Provider URL is hardcoded; no env var. If Google blocks the endpoint, fail loudly — the popup will show "Not found" rather than crash.

## Security Considerations

- Zod schema remains the single source of input validation; no changes to lengths or characters.
- No new endpoints; no new env vars; no secrets stored.