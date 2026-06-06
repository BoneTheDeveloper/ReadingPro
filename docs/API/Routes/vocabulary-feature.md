# Vocabulary API

## Purpose

Save a translated selection from an owned passage as a vocabulary item.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/vocabulary` | Upsert a vocabulary item for the authenticated user. |

## Auth And Ownership

Requires authentication. The route verifies `sourceId` belongs to the authenticated user before saving.

## Request

```json
{
  "sourceId": "uuid",
  "selectedText": "example",
  "translation": "vi translation",
  "contextSentence": "The full context sentence.",
  "sourceLanguage": "en",
  "targetLanguage": "vi",
  "type": "optional label"
}
```

Limits:

- `selectedText`: 1-500 chars.
- `translation`: 1-500 chars.
- `contextSentence`: 1-4000 chars.
- `type`: optional, 1-80 chars.

## Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "selectedText": "example",
    "translation": "vi translation",
    "type": "optional label",
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

## Side Effects

Upserts `VocabularyItem` by a stable key built from user, source, selection, context, and target language.

## Implementation

- Route: `src/app/api/vocabulary/route.ts`
- DB helpers: `src/lib/db/translation-queries.ts`
