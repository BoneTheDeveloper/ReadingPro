# Vocabulary Items API

Capture, browse, and delete vocabulary items. The save path (`POST /api/vocabulary`)
owns the dedup/store strategy.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/vocabulary` | Upsert vocabulary item + create occurrence + add to daily/weekly sets |
| `GET` | `/api/vocabulary/list` | List user's items (paginated, filterable by status, search) |
| `DELETE` | `/api/vocabulary/[id]` | Remove item and all its occurrences |

## Upsert Vocabulary Item

### 1. Purpose

Save a vocabulary item from the translate or dictionary panel. Deduplicates by
`userId + normalizedText + targetLanguage + normalizedTranslation`. On re-save of the
same meaning, increments `savedCount` and records an occurrence; a different meaning
(translation that differs after normalization) creates a separate item. Auto-adds to
daily and weekly sets.

### 2. Method + path

```http
POST /api/vocabulary
```

### 3. Request input

```ts
{
  selectedText: string;       // 1-500 chars, trimmed
  translation: string;       // 1-500 chars, trimmed
  contextSentence?: string;   // 0-4000 chars, trimmed
  sourceId?: string;          // UUID, required when source="TRANSLATE"
  sourceLanguage: "en";
  targetLanguage: "vi";
  source?: "TRANSLATE" | "DICTIONARY";  // default "TRANSLATE"
  dictionaryEntryId?: string;  // UUID
  dictionarySenseId?: string;  // UUID
}
```

When `source="TRANSLATE"`, `sourceId` must be a passage UUID owned by the user. The
route verifies passage ownership before saving.

When `source="DICTIONARY"`, `dictionaryEntryId` and `dictionarySenseId` link the item to
a dictionary entry.

### 4. Success response

Maps the persisted record to `vocabularyDataSchema` at the route boundary.

```ts
{
  success: true;
  data: VocabularyDTO;
}
```

`VocabularyDTO` (= `vocabularyDataSchema`):

```ts
{
  id: string;
  displayText: string;
  translation: string;        // raw, first-saved casing (display value)
  type: string | null;        // "WORD" | "PHRASE"
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
}
```

Internal fields (`userId`, `normalizedText`, `normalizedTranslation`, `status`,
`savedCount`, `nextReviewAt`, `source`, dictionary links, …) are persisted but **not**
exposed on this response.

### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid JSON payload, validation failure (missing/invalid fields) |
| `401` | Missing auth |
| `404` | Source passage not found or not owned by user |
| `500` | Unexpected save failure |

### 6. Notes about dedup / boundaries

- Dedup key: `userId + normalizedText + targetLanguage + normalizedTranslation`
- `normalizedTranslation`: the meaning normalized (lowercased, whitespace-collapsed,
  trimmed) — the discriminator for "same vs different meaning". The raw `translation` is
  kept only as the display value
- On re-save of the same meaning: `savedCount` incremented, `updatedAt` refreshed,
  occurrence recorded (idempotent per passage/context)
- A different meaning (normalized translation differs) creates a separate item
- `status`, `nextReviewAt`, `lastReviewedAt` preserved on re-save (review progress not reset)
- `type` auto-detected: contains space => `PHRASE`, otherwise `WORD`
- `normalizedText`: lowercased, whitespace-normalized
- Daily/weekly set creation and item addition happen as side effects
- See [vocabulary-flow.md](../../../Flows/data-flows/vocabulary-flow.md) for happy/exception/edge/race paths

## List Vocabulary Items

### 1. Purpose

List the authenticated user's vocabulary items with pagination, optional status filter,
and text search.

### 2. Method + path

```http
GET /api/vocabulary/list
```

### 3. Request input

Query params:

```ts
{
  status?: "NEW" | "LEARNING" | "MASTERED";
  search?: string;    // case-insensitive match on normalizedText
  page?: number;     // 1-based, default 1
  pageSize?: number; // 1-100, default 20
}
```

### 4. Success response

```ts
{
  success: true;
  data: {
    items: VocabularyItemWithOccurrences[];
    total: number;
    page: number;
    pageSize: number;
  };
}
```

Each item includes up to 5 most recent occurrences:

```ts
{
  id: string;
  vocabularyItemId: string;
  sourceId: string | null;
  selectedText: string;
  contextSentence: string | null;
  createdAt: string;
}
```

Items are ordered by `updatedAt` descending.

### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `401` | Missing auth |
| `500` | Unexpected list failure |

## Delete Vocabulary Item

### 1. Purpose

Remove a vocabulary item and all its occurrences. Set membership entries are also deleted
via cascade.

### 2. Method + path

```http
DELETE /api/vocabulary/[id]
```

### 3. Request input

Path param: `id` (UUID).

### 4. Success response

```ts
{ success: true }
```

### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `401` | Missing auth |
| `404` | Vocabulary item not found or not owned by user |
| `500` | Unexpected delete failure |

### 6. Notes

- Cascades to `VocabularyOccurrence` and `VocabularySetItem` records.
- Does not delete the `VocabularySet` itself (sets may still contain other items).

## Implementation

- Routes: `src/app/api/vocabulary/route.ts`, `src/app/api/vocabulary/list/route.ts`,
  `src/app/api/vocabulary/[id]/route.ts`
- Item queries: `src/server/db/vocabulary-queries.ts`
- Save flow: [vocabulary-flow.md](../../../Flows/data-flows/vocabulary-flow.md)
