# ADR 0005: Vocabulary Data Model and Review MVP Path

## Status

Accepted

## Context

Vocabulary items are saved from the inline translate panel only. The current `VocabularyItem` model stores `selectedText`, `translation`, `contextSentence`, and `type`, but lacks source tracking, review scheduling, mastery status, and grouping. The dedup key includes `sourceId` and `contextSentence`, so the same word in different passages or contexts creates duplicate entries. There is no way to save from dictionary lookups, no `/vocabulary` page to browse saved words, and no mechanism to group words into study sets.

## Decision

### 1. Two-table vocabulary model

Split vocabulary storage into **VocabularyItem** (the word/phrase + its meaning + review state) and **VocabularyOccurrence** (each context where the word was encountered). One item can have many occurrences across different passages.

**Why:** A learner encounters "algorithm" in 5 different passages. They need one vocabulary entry tracking their mastery of that word, not 5 duplicate rows. But they also want to see all 5 contexts where they encountered it.

```prisma
model VocabularyItem {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String
  normalizedText String
  displayText    String
  type           String   // WORD | PHRASE
  translation    String
  sourceLanguage String
  targetLanguage String

  dictionaryEntryId String?   @db.Uuid
  dictionarySenseId String?   @db.Uuid

  status       String   @default("NEW")
  source       String   @default("USER_SAVED")
  savedCount   Int      @default(1)
  nextReviewAt DateTime?
  lastReviewedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  occurrences VocabularyOccurrence[]
  setItems    VocabularySetItem[]

  @@unique([userId, normalizedText, targetLanguage, translation])
  @@index([userId, status])
  @@index([userId, nextReviewAt])
  @@map("vocabulary_items")
}

model VocabularyOccurrence {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  vocabularyItemId String  @db.Uuid
  sourceId        String?  @db.Uuid
  selectedText    String
  contextSentence String?
  createdAt       DateTime @default(now())

  vocabularyItem VocabularyItem @relation(fields: [vocabularyItemId], references: [id], onDelete: Cascade)

  @@unique([vocabularyItemId, sourceId, contextSentence])
  @@index([sourceId])
  @@map("vocabulary_occurrences")
}
```

Key design choices:

- **`normalizedText`**: lowercased, whitespace-normalized. Used in dedup. `displayText` preserves original casing.
- **`type`**: WORD or PHRASE. Auto-detected from selected text (contains space → PHRASE).
- **`dictionaryEntryId` / `dictionarySenseId`**: nullable FK to dictionary. Set when saved from dictionary or when a dictionary match exists for a translated word. Enables rich dictionary data on the vocabulary page (POS, definitions, examples, related words).
- **`translation`**: only the meaning from the saved context, not all dictionary meanings.
- **`savedCount`**: incremented on each re-save (same word encountered again). Tracks encounter frequency.
- **`sourceId` moved out**: passage reference is on VocabularyOccurrence, not VocabularyItem. The item is passage-agnostic.

### 2. Deduplication strategy

Dedup key: `@@unique([userId, normalizedText, targetLanguage, translation])`

Translation-specific dedup: "bank" → "ngân hàng" and "bank" → "bờ sông" are separate items because they represent different meanings. This aligns with the requirement to store only the meaning from the saved context.

On re-save (matching dedup key):
- Increment `savedCount`
- Update `updatedAt`
- Create a new VocabularyOccurrence for the new context
- Do not change `status`, `nextReviewAt`, or `lastReviewedAt` (preserve review progress)

### 3. Status transitions

```
enum VocabularyStatus {
  NEW
  LEARNING
  MASTERED
}
```

- `NEW` → `LEARNING` on first review attempt
- `LEARNING` → `MASTERED` after N consecutive correct reviews (MVP: N = 2)
- `LEARNING` or `MASTERED` → `LEARNING` on failed review
- Manual override allowed from vocabulary page

`nextReviewAt` schedule:
- `NEW` → first review: `now + 1 day`
- `LEARNING` correct: `now + 3 days`
- `LEARNING` incorrect: `now + 1 day`
- `MASTERED`: `nextReviewAt` set to null

Simplified cadence for MVP. Full SM-2 integration deferred.

### 4. Vocabulary sets with auto-generated daily and weekly sets

```prisma
enum VocabularySetType {
  MANUAL
  DAILY
  WEEKLY
}

model VocabularySet {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String
  name        String
  type        VocabularySetType
  periodStart DateTime?
  periodEnd   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  items VocabularySetItem[]

  @@unique([userId, type, periodStart, periodEnd])
  @@index([userId, type])
  @@map("vocabulary_sets")
}

model VocabularySetItem {
  id               String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  vocabularySetId  String @db.Uuid
  vocabularyItemId String @db.Uuid
  addedAt          DateTime @default(now())

  set  VocabularySet  @relation(fields: [vocabularySetId], references: [id], onDelete: Cascade)
  item VocabularyItem @relation(fields: [vocabularyItemId], references: [id], onDelete: Cascade)

  @@unique([vocabularySetId, vocabularyItemId])
  @@map("vocabulary_set_items")
}
```

Set types:
- **MANUAL**: user-created named sets (e.g. "Chapter 3 words", "Academic vocabulary")
- **DAILY**: auto-created per day. One set per user per day. Name = formatted date.
- **WEEKLY**: auto-created per week. One set per user per ISO week. Name = formatted week range.

The `@@unique([userId, type, periodStart, periodEnd])` constraint ensures at most one daily set per day and one weekly set per week per user.

On save, the system automatically:
1. Finds or creates the daily set for today
2. Finds or creates the weekly set for this week
3. Adds the item to both sets (idempotent via `@@unique([vocabularySetId, vocabularyItemId])`)

### 5. Save flow

See `docs/Flows/vocabulary-flow.md` for the complete save flow.

### 6. API surface

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/vocabulary` | List user's vocabulary items (paginated, filterable by status, search) |
| `POST` | `/api/vocabulary` | Upsert vocabulary item + create occurrence + add to daily/weekly sets |
| `PATCH` | `/api/vocabulary/[id]/status` | Update item status (manual override) |
| `DELETE` | `/api/vocabulary/[id]` | Remove vocabulary item and all its occurrences |
| `GET` | `/api/vocabulary/sets` | List user's vocabulary sets with item counts |
| `POST` | `/api/vocabulary/sets` | Create a manual set |
| `PATCH` | `/api/vocabulary/sets/[id]` | Update set name |
| `DELETE` | `/api/vocabulary/sets/[id]` | Delete set (cascades to set items, not vocabulary items) |
| `POST` | `/api/vocabulary/sets/[id]/items` | Add item(s) to set |
| `DELETE` | `/api/vocabulary/sets/[id]/items/[itemId]` | Remove item from set |

Review endpoints (deferred to Phase 5):

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/vocabulary/due` | Items due for review (status NEW or LEARNING, nextReviewAt <= now) |
| `POST` | `/api/vocabulary/[id]/review` | Submit review result, update status and nextReviewAt |

## Consequences

### Positive
- One vocabulary entry per meaning per user — no passage-based duplication
- Occurrences preserve full context history across passages
- Dictionary link enriches vocabulary page with POS, definitions, examples when available
- Auto daily/weekly sets give zero-friction organization
- savedCount enables encounter-frequency sorting

### Negative
- Two-table model requires joins for vocabulary list with occurrences
- Migration must collapse existing per-passage duplicates into single items + occurrences
- Dictionary link is nullable — UI must handle two rendering paths (rich dictionary data vs plain translation)

### Risks

**Migration collision**: Existing `VocabularyItem` rows with same word across passages will collide under the new unique constraint. Migration must keep one row, create occurrences for dropped rows' contexts, and preserve the most recent `updatedAt`.

**Unbounded occurrences**: A word encountered hundreds of times could have many occurrence rows. Pagination on occurrence queries mitigates this.

**Auto-set proliferation**: Daily/weekly sets accumulate over time. Consider periodic cleanup of old auto-sets or soft archiving. Not blocking for MVP.

## Deferred

- Full SM-2 integration for vocabulary review
- AI-generated vocabulary quiz cards from saved words
- SOURCE set type (auto-group by passage)
- Vocabulary import/export
- Shared/public vocabulary sets
- Vocabulary statistics (status distribution, review streaks)
