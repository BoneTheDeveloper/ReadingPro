# Translation Flow

## Flow

```text
Select text in owned passage
  -> POST /api/translate
  -> validate text/context/source/language limits
  -> getAuthenticatedUser()
  -> executeTranslate()
  -> build exact cache key
  -> read owned Passage + matching TranslationCache in one query
  -> cache hit: return provider "cache" and append TranslationHistory
  -> cache miss: resolve dictionary/fallback/provider path
  -> write TranslationCache and TranslationHistory for successful result
  -> return QuickTranslation DTO
```

## Main Code Paths

| Responsibility | File |
|----------------|------|
| Route | `src/app/api/translate/route.ts` |
| Service | `src/lib/translation/inline/inline-translate.service.ts` |
| Repository | `src/lib/translation/inline/inline-translate.repository.ts` |
| DB helpers | `src/lib/db/translation-queries.ts` |
| Limits | `src/lib/translation/translation-limits.ts` |
| Performance | `src/lib/translation/translate-performance.ts` |

## Persistence

- `TranslationCache` stores successful final translation DTOs keyed by exact
  user/source/selection/context/target.
- `TranslationHistory` stores each completed translation event.
- `VocabularyItem` is written by the separate vocabulary route.

## Cache Rule

`POST /api/translate` uses the conservative exact-cache strategy:

- Cache key inputs are `userId`, `sourceId`, selected text, context sentence,
  and target language.
- Cached data is returned only after the same query verifies the source passage
  still belongs to the authenticated user and is not deleted.
- Cache hits skip dictionary/provider resolution but still append translation
  history asynchronously.
- Only successful final DTOs are cached. Auth failures, source misses, invalid
  payloads, provider failures, and malformed cached JSON are not cached.
- Dictionary API responses are not stored in this translation cache.

## Performance Mode

Performance snapshots are included only when the route receives the expected performance header/gate. Default product responses do not expose benchmark internals.
