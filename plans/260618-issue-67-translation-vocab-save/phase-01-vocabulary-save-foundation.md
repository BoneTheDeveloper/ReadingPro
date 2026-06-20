---
phase: 1
title: "Vocabulary Save Foundation"
status: pending
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: Vocabulary Save Foundation

## Overview

Add an `isNew` flag to the vocabulary upsert response and an `isSavingVocabulary` in-flight guard to the client. This gives the popup the data it needs (Phase 2) and blocks double-clicks.

## Requirements

- Functional:
  - `POST /api/vocabulary` response includes `isNew: boolean` (true = first save, false = already existed)
  - `handleSaveVocabulary` is non-reentrant: while saving, subsequent calls are no-ops
  - Client only adds to `savedVocabularyIds` Set when `isNew === true`
  - Failed save sets a visible error state (consumed by Phase 2 UI)
- Non-functional:
  - No new endpoints
  - DB upsert remains idempotent — `isNew` is derived from existing `savedCount` field

## Architecture

```
POST /api/vocabulary
  body: { sourceId, selectedText, translation, contextSentence, sourceLanguage, targetLanguage, type? }
  → vocabulary-queries.ts: upsertVocabularyItem → returns VocabularyItem (with savedCount)
  → route returns: { data: { ...item, isNew: item.savedCount === 1 } }

Client (study-page-client.tsx):
  isSavingVocabulary: boolean          ← in-flight guard
  VocabularySaveStatus:                ← new type in study-types.ts
    "idle" | "saving" | "saved" | "error"

  handleSaveVocabulary():
    if isSavingVocabulary → return early
    setIsSavingVocabulary(true)
    try:
      POST /api/vocabulary
      parse response (vocabularyResponseSchema — now includes isNew)
      if isNew: add key to savedVocabularyIds Set
      setVocabSaveStatus("saved")
    catch:
      setVocabSaveStatus("error")
      console.error(...)          ← visible in dev; Sentry breadcrumb kept
    finally:
      setIsSavingVocabulary(false)
```

## Related Code Files

- Modify: `src/lib/translation/shared/translation-response-schema.ts`
  — Add `isNew: z.boolean()` to the vocabulary success response shape
- Modify: `src/app/api/vocabulary/route.ts`
  — Return `{ ...item, isNew: item.savedCount === 1 }` in the success branch
- Modify: `src/features/study/study-types.ts`
  — Add `export type VocabularySaveStatus = "idle" | "saving" | "saved" | "error"`
- Modify: `src/features/study/study-page-client.tsx`
  — Replace `savedVocabularyIds` Set logic + add `isSavingVocabulary` + `vocabSaveStatus` state
  — Rewrite `handleSaveVocabulary` with try/finally guard
  — Reset `vocabSaveStatus` to `"idle"` on selection change (inside the existing passage/mode clear block)

## Implementation Steps

1. **`translation-response-schema.ts`** — In the vocabulary success schema, add `isNew: z.boolean()`. Check if there is already a `VocabularyResponseSchema` success branch and add `isNew` there.

2. **`vocabulary/route.ts`** — In the POST success response, change the return to include `isNew: item.savedCount === 1`. Verify `upsertVocabularyItem` already returns `savedCount` (it does per the research — the unique-constraint upsert increments `savedCount`).

3. **`study-types.ts`** — Add:
   ```ts
   export type VocabularySaveStatus = "idle" | "saving" | "saved" | "error";
   ```

4. **`study-page-client.tsx`** — State changes:
   ```ts
   // Replace:
   const [savedVocabularyIds, setSavedVocabularyIds] = useState<Set<string>>(new Set());
   // With:
   const [savedVocabularyIds, setSavedVocabularyIds] = useState<Set<string>>(new Set());
   const [isSavingVocabulary, setIsSavingVocabulary] = useState(false);
   const [vocabSaveStatus, setVocabSaveStatus] = useState<VocabularySaveStatus>("idle");
   ```

5. **`study-page-client.tsx`** — Rewrite `handleSaveVocabulary`:
   ```ts
   const handleSaveVocabulary = useCallback(async () => {
     if (!selection || !quickTranslationState.data || isSavingVocabulary) return;
     setIsSavingVocabulary(true);
     setVocabSaveStatus("saving");
     try {
       const res = await fetch("/api/vocabulary", { ... }); // same payload as before
       const parsed = vocabularyResponseSchema.safeParse(await res.json());
       if (!parsed.success || !res.ok || "error" in parsed.data) throw new Error("Vocabulary save failed");
       if (parsed.data.data.isNew) {
         setSavedVocabularyIds(prev => new Set(prev).add(buildTranslationSelectionKey(selection)));
       }
       setVocabSaveStatus("saved");
       // keep existing Sentry breadcrumb for success
     } catch (err) {
       console.error("[study] vocabulary save failed", err);
       setVocabSaveStatus("error");
       // keep existing Sentry breadcrumb for error
     } finally {
       setIsSavingVocabulary(false);
     }
   }, [selection, quickTranslationState.data, isSavingVocabulary]);
   ```

6. **`study-page-client.tsx`** — In the selection-change clear block (around line 70), also reset:
   ```ts
   setVocabSaveStatus("idle");
   setIsSavingVocabulary(false);
   ```

7. Ensure `vocabSaveStatus` and `isSavingVocabulary` are passed down as props to `StudyTranslationPopup` and `StudyTranslatePanel` (Phase 2 consumes them).

## Success Criteria

- [ ] `POST /api/vocabulary` response includes `isNew: boolean`
- [ ] Rapid double-click on Save sends only one request (second call is no-op while first is in flight)
- [ ] Re-saving a word that was already in DB does NOT add it to `savedVocabularyIds` (shows neutral, not "Saved")
- [ ] Save failure sets `vocabSaveStatus` to `"error"` and logs to console
- [ ] `vocabSaveStatus` resets to `"idle"` on selection change

## Risk Assessment

- **`vocabularyDataSchema` uses `.strict()`** — CONFIRMED. The schema is `.strict()` and only has `id, selectedText, translation, type, createdAt, updatedAt`. The route currently returns the full Prisma `VocabularyItem` which has extra fields (`savedCount`, `normalizedText`, etc.) — meaning the client parse either already strips unknowns (if using `.safeParse` + `.data`) or Zod rejects the response silently. **Fix**: when adding `isNew`, the route must return only the mapped fields that match the schema — `{ id, selectedText, translation, type, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString(), isNew: item.savedCount === 1 }` — and `vocabularyDataSchema` must add `isNew: z.boolean()`.
- **`upsertVocabularyItem` returns `savedCount`** — Confirmed. `savedCount: 1` on create, `savedCount: { increment: 1 }` on update. `isNew = item.savedCount === 1` is correct.

## Security Considerations

- `isNew` is a boolean derived from `savedCount === 1` — no sensitive data exposed.
- No new query parameters or user-controlled inputs introduced.
