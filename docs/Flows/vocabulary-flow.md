# Vocabulary Save Flow

## Save from Translate Panel

```text
User selects text in passage
  -> inline translate returns quick translation
  -> user clicks "Save to vocabulary"
  -> POST /api/vocabulary { selectedText, translation, contextSentence, sourceId, sourceLanguage, targetLanguage, source: "TRANSLATE" }
  -> normalize selectedText
  -> lookup VocabularyItem by userId + normalizedText + targetLanguage + translation
  -> if exists: increment savedCount, update updatedAt
  -> if not exists: create VocabularyItem (status=NEW)
  -> lookup DictionaryEntry by normalizedText (optional enrichment)
     -> if found: set dictionaryEntryId, dictionarySenseId on item
  -> create VocabularyOccurrence (sourceId=passageId, selectedText=original, contextSentence)
  -> find or create daily VocabularySet (type=DAILY, periodStart=today, periodEnd=today)
  -> find or create weekly VocabularySet (type=WEEKLY, periodStart=monday, periodEnd=sunday)
  -> add VocabularySetItem to daily set (idempotent via unique constraint)
  -> add VocabularySetItem to weekly set (idempotent via unique constraint)
  -> return upserted VocabularyItem
```

## Save from Dictionary Panel

```text
User looks up word in dictionary
  -> entry detail shows senses, translations, examples
  -> user clicks "Save to vocabulary" on a specific sense
  -> POST /api/vocabulary { selectedText, translation=sense.primaryTranslation, contextSentence=sense.example|null, sourceId=null, sourceLanguage, targetLanguage, source: "DICTIONARY", dictionaryEntryId, dictionarySenseId }
  -> normalize selectedText
  -> lookup VocabularyItem by userId + normalizedText + targetLanguage + translation
  -> if exists: increment savedCount, update updatedAt
  -> if not exists: create VocabularyItem with dictionaryEntryId + dictionarySenseId
  -> create VocabularyOccurrence (sourceId=null, selectedText=headword, contextSentence=sense.example)
  -> add to daily + weekly sets (same as translate path)
  -> return upserted VocabularyItem
```

## Dedup Behavior

Dedup key: `userId + normalizedText + targetLanguage + translation`

| Scenario | Action |
|----------|--------|
| Same word, same translation, different passage | Update savedCount, create new occurrence, add to sets |
| Same word, different translation | Create new VocabularyItem (different meaning) |
| Same word, same translation, same passage, same context | No-op (occurrence unique constraint prevents duplicate) |

## Auto-Set Generation

| Set Type | When Created | Name Format | Period |
|----------|-------------|-------------|--------|
| DAILY | First save of the day | "June 8, 2026" | periodStart = start of day, periodEnd = end of day |
| WEEKLY | First save of the week | "Jun 2 – Jun 8, 2026" | periodStart = Monday, periodEnd = Sunday |

Both sets are created lazily on first save that needs them. The `@@unique([userId, type, periodStart, periodEnd])` constraint ensures idempotency.

## Status Transitions

```text
NEW --(first review)--> LEARNING
LEARNING --(2 consecutive correct)--> MASTERED
LEARNING --(incorrect)--> LEARNING (reset interval)
MASTERED --(incorrect)--> LEARNING
```

Any status can be manually overridden from the vocabulary page.

## Next Review Schedule

| Current Status | Review Result | nextReviewAt |
|---------------|---------------|-------------|
| NEW | any | now + 1 day |
| LEARNING | correct | now + 3 days |
| LEARNING | incorrect | now + 1 day |
| MASTERED | (no scheduled review) | null |

## Code Paths

- Route: `src/app/api/vocabulary/route.ts`
- DB queries: `src/lib/db/vocabulary-queries.ts` (new)
- Set queries: `src/lib/db/vocabulary-set-queries.ts` (new)
- UI: `src/features/vocabulary/` (new)
- Dictionary enrichment: `src/lib/dictionary/` (existing)
