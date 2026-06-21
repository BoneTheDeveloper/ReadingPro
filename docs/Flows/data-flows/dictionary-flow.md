# Dictionary Data Flow

## Lookup

```text
GET /api/dictionary/lookup?q=...
  -> validate q/sourceLanguage/targetLanguage
  -> authenticate
  -> normalize query
  -> resolveDictionaryLookup()
  -> return entry DTO or miss DTO
```

## Search And Suggest

```text
GET /api/dictionary/suggest?q=...
GET /api/dictionary/search?q=...
  -> validate query
  -> authenticate
  -> normalize
  -> repository query
  -> return ranked DTOs
```

## Entry Detail

```text
GET /api/dictionary/entries/[entryId]
  -> validate UUID
  -> authenticate
  -> load entry/senses/translations
  -> return detail DTO or 404
```

## Data

Dictionary data is shared seed data:

- `DictionaryEntry`
- `DictionarySense`
- `DictionaryTranslation`
- `DictionaryAlias`
- `DictionarySourceAudit`

## Code Paths

- Routes: `src/app/api/dictionary/**/route.ts`
- Services: `src/server/modules/dictionary/**/service.ts`
- Repositories: `src/server/modules/dictionary/**/repository.ts`
- DTO builders: `src/server/modules/dictionary/shared/*`
