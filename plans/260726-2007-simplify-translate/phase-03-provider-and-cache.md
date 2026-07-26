---
title: "Phase C: Provider + Cache"
phase: c
status: pending
priority: P1
effort: 4h
dependencies: [phase-b-placeholder-ui]
---

# Phase C: Provider + Cache

## Overview

Replace the placeholder stub with a real provider call (`translate.googleapis.com`) wrapped in a process-scoped LRU. The hook stops hardcoding responses and starts hitting `POST /api/translate`. Cache hits avoid re-fetching identical text.

## Requirements

- Functional
  - `POST /api/translate` accepts `{ text, context, sourceId, sourceLanguage: "en", targetLanguage: "vi" }` and returns `{ translation: "…", type: null, ipa: null, provider: "google_translate" }`.
  - The provider parses `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=…` JSON.
  - Same text translated twice in one session: second call returns from cache, no second network request.
- Non-functional
  - LRU: ≤500 entries, 24h TTL, key = `normalize(text)` (lowercase + trim + collapse whitespace).
  - 5s `AbortController` timeout; one retry on 5xx or network error with backoff capped at 1s.
  - Provider failures surface as `{ translation: null }` (HTTP 200 OK) so the popup renders the "Not found" state.
  - `pnpm typecheck && pnpm lint` green.

## Architecture

```
Hook (useWordTranslator)
   │  selectedText
   ▼
fetch POST /api/translate
   │  Zod translateRequestSchema
   ▼
executeTranslate(input)
   │  normalize(text)
   ▼
translationCache.get(key)        ──► cache hit → return
   │
   ▼ (miss)
translateWithGoogle(input)       ──► fetch translate.googleapis.com
   │
   ▼
translationCache.set(key, value)
   │
   ▼
Response.json({ translation, type: null, ipa: null, provider: "google_translate" })
```

## Related Code Files

Refer to top-level **File Inventory** in `plan.md`.

This phase owns:
- create: `src/features/reading/server/lib/google-translate.ts`
- create: `src/features/reading/server/lib/translation-cache.ts`
- rewrite: `src/features/reading/server/services/inline-translate.ts`
- rewrite: `src/app/api/translate/route.ts`
- rewrite: `src/features/reading/hooks/use-word-translation.ts` (replace the placeholder body with `fetch`)

## Implementation Steps

1. Implement `google-translate.ts`:
   ```ts
   const ENDPOINT = "https://translate.googleapis.com/translate_a/single";
   export async function translateWithGoogle(input: {
     text: string; sourceLanguage: "en" | "vi"; targetLanguage: "en" | "vi";
   }): Promise<string | null> {
     const url = `${ENDPOINT}?client=gtx&sl=${input.sourceLanguage}&tl=${input.targetLanguage}&dt=t&q=${encodeURIComponent(input.text)}`;
     // fetch with AbortController 5s timeout, 1 retry on 5xx/network, capped backoff
     // parse the nested array; return first non-empty translation string
     // return null on any failure
   }
   ```
2. Implement `translation-cache.ts`:
   ```ts
   const MAX_ENTRIES = 500;
   const TTL_MS = 24 * 60 * 60 * 1000;
   type Entry = { translation: string | null; ipa: string | null; expiresAt: number };
   const store = new Map<string, Entry>();
   export function getCachedTranslation(key: string): Entry | null { … }
   export function setCachedTranslation(key: string, translation: string | null, ipa: string | null): void { … }
   ```
3. Rewrite `executeTranslate`:
   - normalize = `text.toLowerCase().trim().replace(/\s+/g, " ")`
   - cache get → return if hit
   - call `translateWithGoogle`; on null return `{ ok: false, status: 404 }`
   - cache set, return `{ ok: true, data: { translation, type: null, ipa: null, provider: "google_translate" } }`
4. Rewrite `route.ts`: Zod parse, call `executeTranslate`, return `{ translation: null }` on 404 (HTTP 200).
5. Replace the body of `useWordTranslator.translateWord()`:
   ```ts
   const res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: selectedWordInfo.selectedText, context: selectedWordInfo.contextSentence, sourceId: selectedWordInfo.sourceId, sourceLanguage: "en", targetLanguage: "vi" }) });
   const json: TranslationDto = await res.json();
   ```
   Keep the `requestId` race-condition guard from the original.

## Success Criteria

- [ ] `pnpm typecheck && pnpm lint` green.
- [ ] `curl POST /api/translate` with a single English word returns the Vietnamese translation; a second identical call shows zero additional network traffic in the dev network panel.
- [ ] `curl POST /api/translate` with a nonsense string returns `{ translation: null, type: null, ipa: null, provider: "google_translate" }` with HTTP 200.
- [ ] Selecting an unknown word in the popup shows "Không tìm thấy bản dịch".

## Risk Assessment

- Provider URL hardcoded; no env var. If Google blocks the endpoint, fail loudly — the popup shows "Not found" rather than crash.
- LRU without proactive eviction evicts only when access crosses `MAX_ENTRIES`. Fine for MVP.

## Security Considerations

- Zod schema is the single source of input validation; no changes to lengths or characters.
- No new endpoints; no new env vars; no secrets stored.