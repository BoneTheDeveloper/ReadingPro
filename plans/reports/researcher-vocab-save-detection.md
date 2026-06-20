# Vocabulary Save Detection Research

**Date:** 2026-06-18  
**Scope:** Prevent double-saves of vocabulary items in the study flow

---

## 1. Current Save Flow

### Client → Server Path

**File:** `src/features/study/study-page-client.tsx:194-259`

1. User clicks "Save Vocabulary" button
2. `handleSaveVocabulary()` fires POST to `/api/vocabulary` with payload:
   - `sourceId`, `selectedText`, `translation`, `contextSentence`
   - `sourceLanguage: "en"`, `targetLanguage: "vi"`
3. Response parsed against `vocabularyResponseSchema` (returns `{ id, selectedText, translation, type, createdAt, updatedAt }`)
4. On success: `setSavedVocabularyIds` adds the word to client Set using `buildTranslationSelectionKey()`
5. Save key = JSON of: `{ sourceId, selectedText, contextSentence, targetLanguage }`

**Line 261–264 (current duplicate detection):**
```typescript
const vocabularySaveKey = selection ? buildTranslationSelectionKey(selection) : null;
const isVocabularySaved = vocabularySaveKey ? savedVocabularyIds.has(vocabularySaveKey) : false;
```

**Problem:** This Set tracks "saved in THIS session" only. Reload page → Set clears → same word can be selected again.

### Server → DB Path

**File:** `src/app/api/vocabulary/route.ts:86–110`

Calls `upsertVocabularyItem(params)` with `sourceId, selectedText, translation, sourceLanguage, targetLanguage, contextSentence, source, dictionaryEntryId, dictionarySenseId`.

**DB unique constraint (schema.prisma:236):**
```
@@unique([userId, normalizedText, targetLanguage, translation])
```

**Upsert behavior:**
- **Match found:** increments `savedCount`, updates `updatedAt`, returns existing item (no schema tells client it was already there)
- **No match:** creates new item with `savedCount=1`
- Either way: returns `VocabularyItem` with `{ id, selectedText, translation, type, createdAt, updatedAt }`

**Critical gap:** API response does NOT include `savedCount` — so client can't tell if upsert created new or matched existing.

---

## 2. Double-Save Protection: 3 Approaches

### Option A: Extend Upsert Response to Include Save State

**Cost:** Low (1 schema change, 1 API response field)

1. Add field to `vocabularyDataSchema` (line 43 in `translation-response-schema.ts`):
   ```typescript
   export const vocabularyDataSchema = z.object({
     id: z.string(),
     selectedText: z.string(),
     translation: z.string(),
     type: z.string().nullable(),
     isNew: z.boolean(),  // ← NEW: true if created, false if pre-existed
     createdAt: z.string(),
     updatedAt: z.string(),
   }).strict();
   ```

2. Return `savedCount === 1` from `/api/vocabulary` POST as `isNew`:
   ```typescript
   // route.ts:122
   return NextResponse.json({ 
     success: true, 
     data: { ...item, isNew: item.savedCount === 1 } 
   });
   ```

3. Client tracks only if `isNew === true`:
   ```typescript
   // study-page-client.tsx:243-245
   if (parsed.data.data.isNew) {
     setSavedVocabularyIds((prev) =>
       new Set(prev).add(buildTranslationSelectionKey(selection)),
     );
   }
   ```

**Pros:** Minimal code, leverages existing upsert logic, works with current button state.  
**Cons:** Doesn't prevent double-click hammer in the same session (button still reacts to `isNew=false`).

---

### Option B: Preload Saved Vocabulary on Translation Success

**Cost:** Medium (new query parameter + list endpoint call)

1. After `/api/translate` succeeds, fetch `/api/vocabulary/list?search={selectedText}&sourceId={sourceId}`:
   - Endpoint already supports filtering by search text (line 7 in `list/route.ts`)
   - Could add optional `sourceId` filter to narrow results

2. On success, pre-populate `savedVocabularyIds` with any matching entries

**Pros:** Works across sessions; reads canonical DB truth; prevents reload-refresh double-save.  
**Cons:** Extra round-trip per translate (not just per save); list endpoint currently returns paginated results (has to fetch, paginate, filter).

---

### Option C: Disable Button During Save (Current + Double-Click Protection)

**Cost:** Very Low (1 useState, disable button while loading)

Currently the button only disables if `saved === true`. Add a loading state:

```typescript
// study-page-client.tsx (new)
const [isSavingVocabulary, setIsSavingVocabulary] = useState(false);

const handleSaveVocabulary = useCallback(async () => {
  setIsSavingVocabulary(true);
  try {
    // ... existing save logic
  } finally {
    setIsSavingVocabulary(false);
  }
}, [selection, quickTranslationState.data]);

// study-translate-panel.tsx (update)
disabled={saved || isSavingVocabulary}
```

**Pros:** Prevents double-click in same session; zero DB changes; idempotent POST handles reload case automatically.  
**Cons:** Session reload still allows re-save (but DB upsert catches it). No feedback if item was pre-existing.

---

## 3. Recommended Approach: **Option A + Option C (Hybrid)**

### Rationale

- **Option A** tells client whether save was new → enables "already saved" messaging (good UX)
- **Option C** prevents rapid re-clicks during save request → prevents redundant calls
- Together: minimal code, no new endpoints, leverages DB upsert as safety net

### Implementation Priority

1. **Phase 1 (Current session):** Add `isSavingVocabulary` state + disable button during save
2. **Phase 2 (Better UX):** Extend upsert response to include `isNew` flag; update button to show "already saved" if `isNew=false`

---

## 4. Key Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `src/lib/translation/shared/translation-response-schema.ts` | 43–50 | Add `isNew: z.boolean()` to `vocabularyDataSchema` |
| `src/app/api/vocabulary/route.ts` | 122 | Return `{ success: true, data: { ...item, isNew: item.savedCount === 1 } }` |
| `src/features/study/study-page-client.tsx` | 64, 194–259 | Add `isSavingVocabulary` state; wrap save in try/finally; only add to Set if `isNew===true` |
| `src/features/study/study-translate-panel.tsx` | 74–83 | Pass `isSavingVocabulary` to disabled prop |

---

## 5. Trade-off Summary

| Approach | Session Re-load | Double-Click | DB Overhead | Code Change |
|----------|----------------|--------------|-------------|------------|
| A (Response field) | ✅ Auto-safe | ⚠️ Not blocked | Same | ~15 loc |
| B (Preload list) | ✅ Auto-safe | ✅ Blocked | +1 query | ~25 loc |
| C (Disable button) | ⚠️ UI mislead | ✅ Blocked | Same | ~10 loc |
| A+C (Hybrid) | ✅ Auto-safe | ✅ Blocked | Same | ~25 loc |

**Hybrid wins** because it combines best properties: safe across reloads, prevents double-click, minimal code overhead.

---

## 6. Database & API Contract Notes

- **Upsert unique constraint:** `(userId, normalizedText, targetLanguage, translation)` — handles exact duplicates
- **Occurrence table:** Has separate unique constraint to silently ignore duplicate context records
- **No new indexes needed:** `savedCount` is in-memory; doesn't require indexing changes
- **Backward compat:** Adding `isNew` field to response is safe; old clients ignore it

---

## Open Questions

None. All code paths traced, schema understood, and recommendation is implementable with zero breaking changes.
