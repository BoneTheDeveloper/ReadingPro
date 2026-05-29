---
phase: 3
title: "Study Page Selection UI"
status: completed
priority: P1
effort: "5h"
dependencies: [1, 2]
---

# Phase 3: Study Page Selection UI

## Overview

Add inline reading-content selection capture and a lightweight quick translation popup without interrupting the learner's reading flow. This phase wires the backend (Phases 1-2) to the Study UI.

## Requirements

- Functional: Support selecting a single word, phrase, full sentence, and double-click word inside Study reading content.
- Functional: Translate the currently visible Study content only, whether the user is viewing simplified or original text.
- Functional: Store selected text, selection viewport rect, context sentence, source ID, and target language immediately after selection.
- Functional: Show quick translation near the selected text.
- Functional: Save button writes vocabulary through the API.
- Non-functional: Do not auto-open the Translate panel after every selection.
- Non-functional: Clear stale selection when active passage or original/simplified mode changes.
- Non-functional: Do not implement a right-click context menu in v1.
- Non-functional: Add Sentry breadcrumbs for new client interactions without logging raw selected text/context.

## Architecture

### Data flow

```
StudyContentPanel (mouseup/dblclick)
  → normalize text, extract context sentence
  → emit onSelectionChange(TranslationSelection | null)

StudyPageClient
  → stores selection + QuickTranslationData state
  → fetches POST /api/translate { mode: "quick" } on selection change
  → clears selection on passage/mode change
  → renders StudyTranslationPopup

StudyTranslationPopup
  → positioned near selection rect
  → shows translation, type, Open details + Save buttons
  → callbacks to parent: onOpenDetails(), onSaveVocabulary()
```

### State shape in StudyPageClient

```ts
// New state added to StudyPageClient
const [selection, setSelection] = useState<TranslationSelection | null>(null);
const [quickTranslation, setQuickTranslation] = useState<QuickTranslationData | null>(null);
const [translationLoading, setTranslationLoading] = useState(false);
const [savedVocabularyIds, setSavedVocabularyIds] = useState<Set<string>>(new Set());
```

### Context sentence extraction

The reading content renders paragraphs inside `<div className="reading-content">`. Each `<p>` is a paragraph node. On selection:

1. Get `window.getSelection()` range
2. Find the closest `<p>` ancestor via `range.commonAncestorContainer`
3. Extract `paragraph.textContent` as the context sentence
4. Compute `range.getBoundingClientRect()` for popup positioning

### Popup positioning

Use fixed positioning relative to the selection rect. Position below the selection by default, flip above if too close to viewport bottom. Offset horizontally to center on the selection, clamped to viewport edges.

## Related Code Files

- Modify: `src/features/study/study-content-panel.tsx` (183 lines) — add contentRef, selection handlers
- Modify: `src/features/study/study-page-client.tsx` (135 lines) — add translation state, fetch, popup rendering
- Create: `src/features/study/study-translation-popup.tsx` — new component
- Modify: `messages/en.json` — add translation popup keys
- Modify: `messages/vi.json` — add translation popup keys

## Implementation Steps

### Step 1: Add i18n strings

Add to `messages/en.json` Study section:
```json
"translationPopupTitle": "Translation",
"translationLoading": "Translating...",
"translationError": "Translation failed",
"openDetails": "Open details",
"saveVocabulary": "Save",
"vocabularySaved": "Saved"
```

Add Vietnamese equivalents to `messages/vi.json`:
```json
"translationPopupTitle": "Bản dịch",
"translationLoading": "Đang dịch...",
"translationError": "Dịch thất bại",
"openDetails": "Xem chi tiết",
"saveVocabulary": "Lưu",
"vocabularySaved": "Đã lưu"
```

### Step 2: Modify StudyContentPanel — add selection handlers

Current file: `src/features/study/study-content-panel.tsx`

Add to interface:
```ts
interface StudyContentPanelProps {
  passage: PassageData | null;
  error: string | null;
  simplifying: boolean;
  onSimplify: () => void;
  viewMode: "original" | "simplified";          // NEW: controlled by parent
  onViewModeChange: (mode: "original" | "simplified") => void;  // NEW
  onSelectionChange: (selection: TranslationSelection | null) => void;  // NEW
}
```

Changes:
- Remove internal `viewMode` state (lift to parent so parent can clear selection on mode change)
- Add `contentRef = useRef<HTMLDivElement>(null)`
- Add `handleMouseUp` handler:
  1. Get `window.getSelection()`
  2. If no selection or collapsed, call `onSelectionChange(null)` and return
  3. Trim selected text, skip if empty
  4. Get range, find closest `<p>` ancestor, extract context sentence
  5. Compute rect from `range.getBoundingClientRect()`
  6. Call `onSelectionChange({ selectedText, selectionRect, contextSentence, sourceId: passage.id, targetLanguage: "vi" })`
- Add `handleDoubleClick` that calls same logic
- Attach `onMouseUp` and `onDoubleClick` on the reading content `<div>`
- Pass `viewMode`/`onViewModeChange` as controlled props

### Step 3: Create StudyTranslationPopup

New file: `src/features/study/study-translation-popup.tsx`

```ts
interface StudyTranslationPopupProps {
  selection: TranslationSelection;
  translation: QuickTranslationData | null;
  loading: boolean;
  error: string | null;
  saved: boolean;
  onOpenDetails: () => void;
  onSave: () => void;
  onDismiss: () => void;
}
```

Behavior:
- Fixed position near `selection.selectionRect`
- Show loading spinner when `loading`
- Show translation text + type badge when `translation` available
- "Open details" button → calls `onOpenDetails()`
- "Save" / "Saved" button → calls `onSave()` when not saved
- Click outside or Escape → calls `onDismiss()`
- Use shadcn `Button`, compact styling matching existing Studio components
- Max width ~280px, positioned below selection, flip above if near bottom

### Step 4: Modify StudyPageClient — wire translation state

Current file: `src/features/study/study-page-client.tsx`

Add state (see Architecture section above).

Lift viewMode from StudyContentPanel:
```ts
const [contentViewMode, setContentViewMode] = useState<"original" | "simplified">("simplified");
```

Add selection change handler:
```ts
const handleSelectionChange = useCallback((sel: TranslationSelection | null) => {
  setSelection(sel);
  setQuickTranslation(null);
  if (!sel) return;

  // Fetch quick translation
  setTranslationLoading(true);
  Sentry.addBreadcrumb({
    category: "study-translation",
    level: "info",
    message: "study-translation-quick-request",
    data: { sourceId: sel.sourceId, selectedTextLength: sel.selectedText.length },
  });

  fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: sel.selectedText,
      context: sel.contextSentence,
      sourceId: sel.sourceId,
      sourceLanguage: "en",
      targetLanguage: "vi",
      mode: "quick",
    }),
  })
    .then((r) => r.json())
    .then((json) => {
      if (json.success) {
        setQuickTranslation(json.data);
        Sentry.addBreadcrumb({
          category: "study-translation",
          level: "info",
          message: "study-translation-quick-success",
          data: { provider: json.data.provider },
        });
      }
    })
    .catch(() => {
      Sentry.addBreadcrumb({
        category: "study-translation",
        level: "error",
        message: "study-translation-quick-error",
      });
    })
    .finally(() => setTranslationLoading(false));
}, []);
```

Add vocabulary save handler:
```ts
const handleSaveVocabulary = useCallback(async () => {
  if (!selection || !quickTranslation) return;
  // POST /api/vocabulary with selection + translation data
  // On success, add to savedVocabularyIds set
  Sentry.addBreadcrumb({...});
}, [selection, quickTranslation]);
```

Clear selection on passage/mode change:
```ts
useEffect(() => {
  setSelection(null);
  setQuickTranslation(null);
}, [state.activePassageId, contentViewMode]);
```

Pass to StudyContentPanel:
```tsx
<StudyContentPanel
  passage={activePassage}
  error={state.error}
  simplifying={state.simplifying}
  onSimplify={handleSimplify}
  viewMode={contentViewMode}
  onViewModeChange={setContentViewMode}
  onSelectionChange={handleSelectionChange}
/>
```

Render popup inside content panel area:
```tsx
{selection && activePassage && (
  <StudyTranslationPopup
    selection={selection}
    translation={quickTranslation}
    loading={translationLoading}
    error={null}
    saved={/* check savedVocabularyIds */}
    onOpenDetails={/* set viewingTranslate in right panel */}
    onSave={handleSaveVocabulary}
    onDismiss={() => setSelection(null)}
  />
)}
```

### Step 5: Update StudyStudioPanel — enable translate card

Change the translate card in `studioCards` array from `disabled: true` to:
```ts
{
  id: "translate",
  labelKey: "translate",
  descriptionKey: "vietnameseTranslation",
  icon: Languages,
  disabled: false,  // ENABLED
}
```

Add `viewingTranslate` state and render logic (minimal stub for Phase 3, full panel in Phase 4).

### Step 6: Add Sentry breadcrumbs

Add breadcrumbs for:
- `study-translation-selection-captured` — on mouseup/dblclick with text length
- `study-translation-quick-request` — before fetch with source ID
- `study-translation-quick-success` — on success with provider
- `study-translation-quick-error` — on failure
- `study-vocabulary-save-click` — on save button click

All metadata: source ID, text lengths, mode, provider. No raw text.

## Success Criteria

- [ ] Selecting text in reading content displays a popup without opening the right panel
- [ ] Clicking popup buttons does not lose the selected text/context
- [ ] Double-click word selection triggers the same quick translation flow
- [ ] Stale popup disappears after changing passages or content mode
- [ ] Save sends selected text, translation, context, source ID, and target language to `/api/vocabulary`
- [ ] No custom right-click menu is added in v1
- [ ] UI breadcrumbs exist for selection, quick translation request/result, details open, and save click with privacy-safe metadata

## Risk Assessment

Browser selection behavior is hard to unit-test in jsdom. Keep DOM logic small, deterministic, and covered by component tests where possible; add Playwright coverage if jsdom cannot verify real selection behavior.

### Mitigation: Selection helper isolation

Extract the text selection + context sentence logic into a pure function `extractSelectionInfo(contentRef, passageId)` that takes a ref and returns `TranslationSelection | null`. This makes it testable without a real browser.
