# Vocabulary API

## Purpose

Save, browse, and manage vocabulary items. Items are deduplicated by user, normalized text, target language, and **normalized translation**. Each save creates an occurrence record and auto-adds the item to daily/weekly sets.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/vocabulary` | Upsert vocabulary item + create occurrence + add to daily/weekly sets |
| `GET` | `/api/vocabulary/list` | List user's vocabulary items (paginated, filterable by status, search) |
| `PATCH` | `/api/vocabulary/[id]/status` | Update item status (manual override) |
| `POST` | `/api/vocabulary/[id]/review` | Submit a spaced-repetition review outcome |
| `DELETE` | `/api/vocabulary/[id]` | Remove vocabulary item and all its occurrences |
| `GET` | `/api/vocabulary/sets` | List user's vocabulary sets with item counts |
| `POST` | `/api/vocabulary/sets` | Create a manual set |
| `PATCH` | `/api/vocabulary/sets/[id]` | Update set name |
| `DELETE` | `/api/vocabulary/sets/[id]` | Delete set |
| `POST` | `/api/vocabulary/sets/[id]/items` | Add item(s) to set |
| `DELETE` | `/api/vocabulary/sets/[id]/items/[itemId]` | Remove item from set |

## Auth And Ownership

All routes require authentication. Ownership is enforced by checking `userId` on every read/update/delete. Unauthenticated requests return `{ "error": "Authentication required." }` with `401`. Ownership misses return appropriate `404` errors.

## Endpoints

### Upsert Vocabulary Item

#### 1. Purpose

Save a vocabulary item from the translate or dictionary panel. Deduplicates by `userId + normalizedText + targetLanguage + normalizedTranslation`. On re-save of the same meaning, increments `savedCount` and records an occurrence; a different meaning (translation that differs after normalization) creates a separate item. Auto-adds to daily and weekly sets.

#### 2. Method + path

```http
POST /api/vocabulary
```

#### 3. Request input

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

When `source="TRANSLATE"`, `sourceId` must be a passage UUID owned by the user. The route verifies passage ownership before saving.

When `source="DICTIONARY"`, `dictionaryEntryId` and `dictionarySenseId` link the item to a dictionary entry.

#### 4. Success response

The route maps the persisted record to the stable `vocabularyDataSchema` DTO at the
boundary — it does **not** return the raw Prisma row. The client parses this shape
with a `.strict()` schema, so extra fields would be rejected.

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

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid JSON payload, validation failure (missing/invalid fields) |
| `401` | Missing auth |
| `404` | Source passage not found or not owned by user |
| `500` | Unexpected save failure |

#### 6. Notes about cache / auth / boundaries

- Dedup key: `userId + normalizedText + targetLanguage + normalizedTranslation`
- `normalizedTranslation`: the meaning normalized (lowercased, whitespace-collapsed, trimmed) — the discriminator for "same vs different meaning". The raw `translation` is kept only as the display value
- On re-save of the same meaning: `savedCount` incremented, `updatedAt` refreshed, occurrence recorded (idempotent per passage/context)
- A different meaning (normalized translation differs) creates a separate item
- `status`, `nextReviewAt`, `lastReviewedAt` preserved on re-save (review progress not reset)
- `type` auto-detected: contains space => `PHRASE`, otherwise `WORD`
- `normalizedText`: lowercased, whitespace-normalized
- Response is mapped Prisma → DTO at the route boundary (raw records are not stable API DTOs)
- Daily/weekly set creation and item addition happen as side effects
- See [vocabulary-flow.md](../../Flows/data-flows/vocabulary-flow.md) for happy/exception/edge/race paths

### List Vocabulary Items

#### 1. Purpose

List the authenticated user's vocabulary items with pagination, optional status filter, and text search.

#### 2. Method + path

```http
GET /api/vocabulary/list
```

#### 3. Request input

Query params:

```ts
{
  status?: "NEW" | "LEARNING" | "MASTERED";
  search?: string;    // case-insensitive match on normalizedText
  page?: number;     // 1-based, default 1
  pageSize?: number; // 1-100, default 20
}
```

#### 4. Success response

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

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `401` | Missing auth |
| `500` | Unexpected list failure |

### Update Vocabulary Status

#### 1. Purpose

Manually override a vocabulary item's mastery status. Used from the vocabulary page to promote or reset items.

#### 2. Method + path

```http
PATCH /api/vocabulary/[id]/status
```

#### 3. Request input

```ts
{
  status: "NEW" | "LEARNING" | "MASTERED";
}
```

#### 4. Success response

```ts
{
  success: true;
  data: VocabularyItem;  // updated item
}
```

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid JSON payload or invalid status value |
| `401` | Missing auth |
| `404` | Vocabulary item not found or not owned by user |
| `500` | Unexpected update failure |

### Review Vocabulary Item

#### 1. Purpose

Submit a spaced-repetition review outcome for a vocabulary item. Advances the
item's mastery status and schedules the next review using the lightweight
spaced-repetition engine (see [Spaced Repetition](#spaced-repetition)).

#### 2. Method + path

```http
POST /api/vocabulary/[id]/review
```

#### 3. Request input

```ts
{
  isCorrect: boolean;
}
```

#### 4. Success response

```ts
{
  success: true;
  data: VocabularyItem;  // with updated status, nextReviewAt, lastReviewedAt
}
```

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid JSON payload or missing `isCorrect` |
| `401` | Missing auth |
| `404` | Vocabulary item not found or not owned by user |
| `500` | Unexpected review failure |

### Delete Vocabulary Item

#### 1. Purpose

Remove a vocabulary item and all its occurrences. Set membership entries are also deleted via cascade.

#### 2. Method + path

```http
DELETE /api/vocabulary/[id]
```

#### 3. Request input

Path param: `id` (UUID).

#### 4. Success response

```ts
{ success: true }
```

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `401` | Missing auth |
| `404` | Vocabulary item not found or not owned by user |
| `500` | Unexpected delete failure |

#### 6. Notes about cache / auth / boundaries

- Cascades to `VocabularyOccurrence` and `VocabularySetItem` records.
- Does not delete the `VocabularySet` itself (sets may still contain other items).

### List Vocabulary Sets

#### 1. Purpose

List the authenticated user's vocabulary sets with item counts.

#### 2. Method + path

```http
GET /api/vocabulary/sets
```

#### 3. Request input

Query params:

```ts
{
  type?: "MANUAL" | "DAILY" | "WEEKLY";
}
```

#### 4. Success response

```ts
{
  success: true;
  data: VocabularySetWithCount[];
}
```

```ts
{
  id: string;
  userId: string;
  name: string;
  type: "MANUAL" | "DAILY" | "WEEKLY";
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { items: number };
}
```

Sets are ordered by `createdAt` descending.

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `401` | Missing auth |
| `500` | Unexpected list failure |

### Create Manual Set

#### 1. Purpose

Create a user-named vocabulary set (MANUAL type).

#### 2. Method + path

```http
POST /api/vocabulary/sets
```

#### 3. Request input

```ts
{
  name: string;  // 1-100 chars, trimmed
}
```

#### 4. Success response

```ts
{
  success: true;
  data: VocabularySet;
}
```

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid JSON payload or invalid name |
| `401` | Missing auth |
| `500` | Unexpected creation failure |

### Update Set Name

#### 1. Purpose

Rename a manual vocabulary set.

#### 2. Method + path

```http
PATCH /api/vocabulary/sets/[id]
```

#### 3. Request input

```ts
{
  name: string;  // 1-100 chars, trimmed
}
```

#### 4. Success response

```ts
{
  success: true;
  data: VocabularySet;  // updated set
}
```

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid JSON payload or invalid name |
| `401` | Missing auth |
| `404` | Vocabulary set not found or not owned by user |
| `500` | Unexpected update failure |

### Delete Set

#### 1. Purpose

Delete a vocabulary set. Cascades to set item membership but does not delete the vocabulary items themselves.

#### 2. Method + path

```http
DELETE /api/vocabulary/sets/[id]
```

#### 3. Request input

Path param: `id` (UUID).

#### 4. Success response

```ts
{ success: true }
```

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `401` | Missing auth |
| `404` | Vocabulary set not found or not owned by user |
| `500` | Unexpected delete failure |

### Add Items to Set

#### 1. Purpose

Add one or more vocabulary items to a set. Idempotent -- duplicate additions are silently ignored via unique constraint.

#### 2. Method + path

```http
POST /api/vocabulary/sets/[id]/items
```

#### 3. Request input

```ts
{
  itemIds: string[];  // 1-50 UUIDs
}
```

#### 4. Success response

```ts
{ success: true }
```

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid JSON payload or invalid itemIds |
| `401` | Missing auth |
| `404` | Vocabulary set not found or not owned by user |
| `500` | Unexpected failure |

#### 6. Notes about cache / auth / boundaries

- All additions are processed in parallel. Individual unique-constraint violations are caught and silently resolved (idempotent).
- Maximum 50 items per request.

### Remove Item from Set

#### 1. Purpose

Remove a vocabulary item from a set. Does not delete the vocabulary item itself.

#### 2. Method + path

```http
DELETE /api/vocabulary/sets/[id]/items/[itemId]
```

#### 3. Request input

Path params: `id` (set UUID), `itemId` (vocabulary item UUID).

#### 4. Success response

```ts
{ success: true }
```

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `401` | Missing auth |
| `404` | Vocabulary set not found or not owned by user |
| `500` | Unexpected failure |

## Spaced Repetition

Vocabulary review scheduling is powered by the lightweight spaced-repetition
engine (`src/server/modules/spaced-repetition`). This is a deliberately simple
interval model for lightweight content (per ADR 0005) — not a full SM-2
implementation. `POST /api/vocabulary/[id]/review` is its only HTTP surface.

`simpleSchedule(currentStatus, isCorrect)` transitions are:

| Current status | `isCorrect` | Next status | Next review |
|----------------|-------------|-------------|-------------|
| `NEW` | `true` | `LEARNING` | +1 day |
| `LEARNING` | `true` | `MASTERED` | none (no further review) |
| any | `false` | `LEARNING` | +1 day |

On review, the item's `status`, `nextReviewAt`, and `lastReviewedAt` are updated.

## Implementation

- Routes: `src/app/api/vocabulary/route.ts`, `src/app/api/vocabulary/list/route.ts`, `src/app/api/vocabulary/[id]/route.ts`, `src/app/api/vocabulary/[id]/status/route.ts`, `src/app/api/vocabulary/[id]/review/route.ts`, `src/app/api/vocabulary/sets/route.ts`, `src/app/api/vocabulary/sets/[id]/route.ts`, `src/app/api/vocabulary/sets/[id]/items/route.ts`, `src/app/api/vocabulary/sets/[id]/items/[itemId]/route.ts`
- Item queries: `src/server/db/vocabulary-queries.ts`
- Set queries: `src/server/db/vocabulary-set-queries.ts`
- Spaced-repetition engine: `src/server/modules/spaced-repetition/scheduler.ts`
- Save flow: `docs/Flows/data-flows/vocabulary-flow.md`
