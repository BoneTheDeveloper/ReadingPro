# Translation Data Flow

Covers: UC-09 Translate Selection. Route: `POST /api/translate` (inline quick
translation). Authoring follows [the per-route path taxonomy](./README.md).

---

## `POST /api/translate`

### Happy Path

```text
User selects English text in an owned passage
  -> POST /api/translate { text, context, sourceId, sourceLanguage:"en", targetLanguage:"vi", clientMetrics? }
  -> validate request (strict Zod: text/context length limits, sourceId UUID, fixed languages)
  -> getUserId()
  -> executeTranslate(): build exact cache key (userId + sourceId + text + context + target)
  -> read owned Passage + matching TranslationCache in one query
        cache hit  -> return provider "cache"; append TranslationHistory (async)
        cache miss -> resolve dictionary -> phrase -> provider (google_translate) -> fallback
                   -> write TranslationCache + TranslationHistory for the successful result
  -> 200 { success: true, data: QuickTranslation DTO }   // { translation, type, provider }
```

The client parses the response against `translateResponseSchema` (strict). The route
returns only the DTO fields; benchmark internals are gated (see Edge Case).

### Exception Flow

| Trigger | Status | Response |
|---------|--------|----------|
| Malformed JSON body | `400` | `{ error: "Invalid JSON payload." }` |
| Schema validation fails (over-limit text/context, bad UUID, wrong language literal, unknown field — schema is `.strict()`) | `400` | `{ error: "Invalid translation request." }` |
| Unauthenticated | `401` | `{ error: "Authentication required." }` |
| `sourceId` passage not owned / deleted | rejected before provider call | error envelope; nothing cached |
| Provider failure | falls through to fallback path | failures are **not** cached |

Telemetry logs `sourceId` and selected-text **length** only — never the raw selection
or context.

### Edge Case / Boundary Condition

| Case | Decision |
|------|----------|
| Selection at the upper length limit | Allowed up to `MAX_TRANSLATE_TEXT_LENGTH`; context clamped via `clampTranslationContext` before send |
| Word vs phrase vs sentence vs paragraph | Same route; resolution source (`dictionary`/`phrase`/`google_translate`/`fallback`) is chosen internally and surfaced as `provider` |
| Repeat translate of an identical selection+context | Served from `TranslationCache` (provider `"cache"`); dictionary/provider resolution skipped, history still appended |
| Malformed cached JSON | Treated as a miss and re-resolved; not returned |
| Performance header absent (default) | Benchmark/timing internals are **omitted** from the response; only the product DTO is returned |

> **Cache boundary (resolution):** a cache hit is returned **only after** the same
> query confirms the source passage still belongs to the authenticated user and is not
> deleted. Ownership is never assumed from the cache key alone.

### Race Condition

| Scenario | Resolution |
|----------|------------|
| Two identical translate requests in flight (cache cold) | Both may resolve and write `TranslationCache`; the cache write is keyed on the exact tuple, so the second write is a harmless overwrite of an equal value — no duplicate cache identity |
| `TranslationHistory` appended on every completed translate | Append-only; concurrent appends are independent rows by design |

Quick translation is idempotent from the user's view: repeated calls yield the same
DTO. The client de-dupes overlapping requests with a `requestId` guard (UX), not the
server.

---

## Persistence

| Table | Write | Notes |
|-------|-------|-------|
| `TranslationCache` | upsert on exact tuple | Only successful final DTOs; dictionary API responses are **not** stored here |
| `TranslationHistory` | append | One row per completed translation event |

`VocabularyItem` is **not** written here — saving is a separate user action handled by
[vocabulary-flow.md](./vocabulary-flow.md).

## Code Paths

| Responsibility | File |
|----------------|------|
| Route | `src/app/api/translate/route.ts` |
| Service | `src/server/modules/translation/inline/inline-translate.service.ts` |
| Repository | `src/server/modules/translation/inline/inline-translate.repository.ts` |
| DB helpers | `src/server/db/translation-queries.ts` |
| Limits | `src/contracts/translation/translation-limits.ts` |
| Performance gate | `src/contracts/translation/translate-performance.ts` |
| Response contract | `src/contracts/translation/translation-response-schema.ts` (`translateResponseSchema`) |
