# Vocabulary Save Data Flow

Covers: UC-10 Save Vocabulary. Routes: `POST /api/vocabulary` (capture). Browse,
review, set-management, and delete routes are documented in
[API/Routes/vocabulary/](../../API/Routes/vocabulary/README.md); this flow focuses on the
capture path, which is where the dedup/store strategy lives.

Authoring follows [the per-route path taxonomy](./README.md).

---

## `POST /api/vocabulary`

### Happy Path

```text
User has a quick translation (TRANSLATE) or a chosen dictionary sense (DICTIONARY)
  -> POST /api/vocabulary { selectedText, translation, contextSentence?, sourceId?, sourceLanguage:"en", targetLanguage:"vi", source }
  -> validate request (Zod) ; authenticate (getUserId)
  -> if source="TRANSLATE": verify sourceId passage is owned by user
  -> normalizedText        = normalize(selectedText)     // lowercase + collapse-spaces + trim
  -> normalizedTranslation = normalize(translation)      // same normalization, applied to the meaning
  -> upsert VocabularyItem on key (userId, normalizedText, targetLanguage, normalizedTranslation)
        match    -> increment savedCount, refresh updatedAt   (meaning already captured)
        no match -> create item (status=NEW, savedCount=1; displayText + raw translation kept for display)
  -> create VocabularyOccurrence (idempotent on itemId + sourceId + contextSentence)
  -> find-or-create daily + weekly VocabularySet ; add item to both (idempotent)
  -> map the persisted item -> Vocabulary DTO            // boundary mapping, not the raw Prisma row
  -> 200 { success: true, data: <VocabularyDTO> }
```

The response is the stable DTO `{ id, displayText, translation, type, createdAt,
updatedAt }` defined by `vocabularyDataSchema`. The route **must** map to this shape;
returning the raw Prisma record breaks the client's strict parse (see Exception Flow).

### Exception Flow

| Trigger | Status | Response |
|---------|--------|----------|
| Malformed JSON body | `400` | `{ error: "Invalid JSON payload." }` |
| Schema validation fails (missing/oversized fields) | `400` | `{ error: "Invalid vocabulary request." }` |
| Unauthenticated | `401` | `{ error: "Authentication required." }` |
| `source="TRANSLATE"` but `sourceId` passage not found / not owned | `404` | `{ error: <VocabularyServiceError message> }` |
| Unexpected persistence failure | `500` | `{ error: "Unable to save vocabulary." }` |

Telemetry on every branch logs only `sourceId` and text **lengths** — never the raw
selected text or context.

### Edge Case / Boundary Condition

The capture path's defining concern is **what counts as "the same" vocabulary item**.
Identity key: `userId + normalizedText + targetLanguage + normalizedTranslation`.

| Case | Decision | Why |
|------|----------|-----|
| Same word, same meaning, re-saved | **Update in place** — one item, `savedCount++` | A re-save is reinforcement, not a new entry |
| Same word, **different** meaning | **New item** — distinct `normalizedTranslation` → separate row | Each meaning is its own study target |
| Same word, meanings differing only by case/whitespace (`"Chạy"` vs `"chạy"`) | **Same item** — translation is normalized before keying | Provider/casing noise must not create perceived duplicates |
| Same word + meaning, **different passage/context** | One item, **+1 occurrence**, `savedCount++` | Records "seen in" without duplicating the term |
| Same word + meaning + same passage + same context | Item `savedCount++`; occurrence is a **no-op** | Occurrence unique constraint prevents duplicate context rows |
| `selectedText` contains a space | `type = PHRASE`; otherwise `WORD` | Auto-detected, set on create only |

`displayText` and the raw `translation` are captured from the **first** save and
preserved on later updates; only `savedCount`/`updatedAt` change. Review progress
(`status`, `nextReviewAt`, `lastReviewedAt`) is never reset by a re-save.

> **Discriminator boundary (resolution):** "meaning" is compared on the *normalized
> translation string*, not semantics. Two genuinely different senses that normalize
> to the same Vietnamese string will merge; this is accepted as rare. Sense-level
> identity (keying on `dictionarySenseId`) is out of scope for this flow.

### Race Condition

| Scenario | Resolution |
|----------|------------|
| Two concurrent saves of the same word+meaning (double-submit, multi-tab) | The `@@unique(userId, normalizedText, targetLanguage, normalizedTranslation)` constraint makes the upsert atomic — one create wins, the other resolves to an update; no duplicate row |
| Concurrent occurrence writes for the same item+context | `@@unique(vocabularyItemId, sourceId, contextSentence)` collapses them to one occurrence |
| First save of the day/week racing to create daily/weekly sets | `find-or-create` keyed on `@@unique(userId, type, periodStart, periodEnd)` — one set wins, the loser reuses it |

A client-side in-flight guard (block the Save control while a request is pending) is
a **UX** concern handled in the UI layer; server correctness does not depend on it.

---

## Persistence

| Table | Write | Key |
|-------|-------|-----|
| `VocabularyItem` | upsert | `userId + normalizedText + targetLanguage + normalizedTranslation` |
| `VocabularyOccurrence` | create (idempotent) | `vocabularyItemId + sourceId + contextSentence` |
| `VocabularySet` (DAILY/WEEKLY) | find-or-create | `userId + type + periodStart + periodEnd` |
| `VocabularySetItem` | add (idempotent) | set + item |

## Code Paths

| Responsibility | File |
|----------------|------|
| Route + DTO mapping | `src/app/api/vocabulary/route.ts` |
| Service (ownership + orchestration) | `src/server/modules/vocabulary/vocabulary.service.ts` |
| Item upsert + normalization | `src/server/db/vocabulary-queries.ts` |
| Set queries | `src/server/db/vocabulary-set-queries.ts` |
| Response contract | `src/contracts/translation/translation-response-schema.ts` (`vocabularyDataSchema`) |
| Schema + unique key | `prisma/schema/vocabulary.prisma` |

## Status Transitions & Review Schedule

Item mastery transitions and `nextReviewAt` scheduling are owned by the
spaced-repetition flow, not the save path. See
[spaced-repetition-flow.md](./spaced-repetition-flow.md).
