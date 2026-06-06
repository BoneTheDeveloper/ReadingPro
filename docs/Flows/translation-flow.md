# Translation Flow

## Flow

```text
Select text in owned passage
  -> POST /api/translate
  -> validate text/context/source/language limits
  -> getAuthenticatedUser()
  -> executeTranslate()
  -> verify owned Passage by sourceId + userId
  -> cache/dictionary/provider resolution
  -> write TranslationCache and TranslationHistory
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

- `TranslationCache` stores reusable responses keyed by user/source/selection/context/target.
- `TranslationHistory` stores each completed translation event.
- `VocabularyItem` is written by the separate vocabulary route.

## Performance Mode

Performance snapshots are included only when the route receives the expected performance header/gate. Default product responses do not expose benchmark internals.

