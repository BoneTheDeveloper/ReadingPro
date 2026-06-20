---
phase: 2
title: "Save Button in Popup"
status: pending
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 2: Save Button in Popup

## Overview

Add an icon-based save button directly in `StudyTranslationPopup` so the user can save without opening the sidebar. Four states: idle (bookmark outline) → saving (spinner) → saved (filled bookmark, disabled) → error (✗ icon, enabled, retryable + console.error already wired in Phase 1).

## Requirements

- Functional:
  - Translation popup shows a save button when translation status is `"success"`
  - Button reflects `VocabularySaveStatus`: idle / saving / saved / error
  - Error state allows retry (button re-enables)
  - Sidebar panel (`StudyTranslatePanel`) stays consistent — update its save button to use the same status props
- Non-functional:
  - Use existing icon library already in the project (check what Lucide icons are imported elsewhere)
  - No new dependencies

## Architecture

```
StudyPageClient
  vocabSaveStatus: VocabularySaveStatus    (from Phase 1)
  isSavingVocabulary: boolean              (from Phase 1)
  isVocabularySaved: boolean               (derived: savedVocabularyIds.has(key))
  handleSaveVocabulary: () => Promise<void>

  ↓ props
StudyTranslationPopup
  onSave: () => void
  saveStatus: VocabularySaveStatus
  isSaved: boolean                   (from savedVocabularyIds — already existing)

  Save button states:
    idle    → <Bookmark /> + "Save"             enabled
    saving  → <Loader2 className="animate-spin" /> + "Saving…"   disabled
    saved   → <BookmarkCheck /> + "Saved"       disabled, muted color
    error   → <X /> + "Error"                  enabled, red, small error note below
```

## Related Code Files

- Modify: `src/features/study/study-translation-popup.tsx`
  — Accept `saveStatus: VocabularySaveStatus` + `onSave` + `isSaved` props
  — Render save button in the success state section
- Modify: `src/features/study/study-page-client.tsx`
  — Pass `saveStatus={vocabSaveStatus}`, `isSaved={isVocabularySaved}`, `onSave={handleSaveVocabulary}` to `<StudyTranslationPopup />`
- Modify: `src/features/study/study-translate-panel.tsx`
  — Update existing save button to use same `saveStatus` prop (keep parity)

## Implementation Steps

1. **Check icons available** — scan `study-translation-popup.tsx` and `study-translate-panel.tsx` imports to confirm which Lucide icons are already used. Target icons: `Bookmark`, `BookmarkCheck`, `Loader2`, `X` (all standard Lucide).

2. **`study-translation-popup.tsx`** — Add props:
   ```ts
   interface StudyTranslationPopupProps {
     // existing props...
     onSave: () => void;
     saveStatus: VocabularySaveStatus;
     isSaved: boolean;
   }
   ```

3. **`study-translation-popup.tsx`** — Inside the success render block, add the save button:
   ```tsx
   const saveButtonContent = {
     idle:   { icon: <Bookmark className="w-4 h-4" />,      label: t("save"),       disabled: false, className: "" },
     saving: { icon: <Loader2 className="w-4 h-4 animate-spin" />, label: t("saving"), disabled: true,  className: "" },
     saved:  { icon: <BookmarkCheck className="w-4 h-4" />, label: t("saved"),      disabled: true,  className: "text-muted-foreground" },
     error:  { icon: <X className="w-4 h-4" />,             label: t("saveError"),  disabled: false, className: "text-destructive" },
   }[saveStatus];

   // If already saved this session (isSaved) override to saved state visually
   const effectiveState = isSaved ? saveButtonContent.saved : saveButtonContent;

   <Button variant="outline" size="sm" disabled={effectiveState.disabled}
     className={effectiveState.className} onClick={onSave}>
     {effectiveState.icon}
     <span className="ml-1">{effectiveState.label}</span>
   </Button>
   {saveStatus === "error" && (
     <p className="text-xs text-destructive mt-1">{t("saveErrorHint")}</p>
   )}
   ```

4. **i18n keys** — In `Study` namespace, these already exist and MUST be reused:
   - `saveVocabulary` → use as idle button label ("Save")
   - `vocabularySaved` → use as saved state label ("Saved")
   Still need to add (verify they don't exist first):
   - `savingVocabulary` → "Saving…"
   - `saveVocabularyError` → "Error"
   - `saveVocabularyErrorHint` → "Failed to save. Tap to retry."
   Add to `localization/messages/en.json` under `Study` key and the `vi.json` equivalent.

5. **`study-page-client.tsx`** — Wire new props to `<StudyTranslationPopup>`:
   ```tsx
   <StudyTranslationPopup
     // existing props...
     onSave={handleSaveVocabulary}
     saveStatus={vocabSaveStatus}
     isSaved={isVocabularySaved}
   />
   ```

6. **`study-translate-panel.tsx`** — Find the existing save button and update it to accept + use the same `saveStatus` / `isSaved` props so the sidebar remains consistent with the popup.

## Success Criteria

- [ ] Save button visible in translation popup when translation status is `"success"`
- [ ] Four button states render correctly (idle / saving / saved / error)
- [ ] Error state shows small hint text below the button
- [ ] Already-saved word (in Set) shows "Saved" state immediately without clicking
- [ ] Sidebar save button uses same state props (no regression)
- [ ] i18n keys added for all button labels

## Risk Assessment

- **`isSaved` vs `vocabSaveStatus === "saved"`** — these can diverge: `isSaved` reflects session Set (persists while open), `saveStatus` is per-save operation (resets on selection change). Use `isSaved` as the steady-state override; `saveStatus` drives the transition animation.
- **i18n namespace confirmed** — popup uses `useTranslations("Study")` (line 95). All keys go in the `Study` namespace in `localization/messages/en.json`. Existing keys `saveVocabulary` and `vocabularySaved` MUST be reused — don't create `save`/`saved` duplicates.

## Security Considerations

None — pure UI change, no new data flows.
