---
phase: 3
title: "Study Page Selection UI"
status: pending
priority: P1
effort: "5h"
dependencies: [1, 2]
---

# Phase 3: Study Page Selection UI

## Overview

Add inline reading-content selection capture and a lightweight quick translation popup without interrupting the learner's reading flow.

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

Keep selection state in `StudyPageClient`, not inside the browser selection object:

```ts
TranslationSelection {
  selectedText;
  selectionRect;
  contextSentence;
  sourceId;
  targetLanguage: "vi";
}
```

`StudyContentPanel` emits selection snapshots. `StudyPageClient` fetches quick translation and passes state to `StudyTranslationPopup`. The popup calls `Open details` and `Save` callbacks owned by the parent.

Client observability:

- Add breadcrumbs for `study-translation-selection-captured`, `study-translation-quick-request`, `study-translation-quick-success`, `study-translation-quick-error`, and `study-vocabulary-save-click`.
- Breadcrumb metadata may include source ID, target language, selected text length, context length, mode, and response status.
- Do not send raw selected text or context into breadcrumbs.

## Related Code Files

- Modify: `src/features/study/study-page-client.tsx`
- Modify: `src/features/study/study-content-panel.tsx`
- Create: `src/features/study/study-translation-popup.tsx`
- Modify: `messages/en.json`, `messages/vi.json`

## Implementation Steps

1. Add a content ref and selection event handlers to the reading content container.
2. Normalize selected text and derive context sentence from the containing paragraph, falling back to paragraph text.
3. Store selection snapshots in `StudyPageClient` and clear them when active passage/mode changes.
4. Fetch quick translation through `/api/translate` with `mode: "quick"` when selection changes.
5. Render a compact popup near the stored rect with selected text, quick translation/type, `Open details`, and `Save`.
6. Implement save state so repeated saves show stable saved/disabled feedback.
7. Add Sentry breadcrumbs around selection capture, quick fetch lifecycle, detail open, and save click.
8. Add localized strings for quick translation UI.

## Success Criteria

- [ ] Selecting text in reading content displays a popup without opening the right panel.
- [ ] Clicking popup buttons does not lose the selected text/context.
- [ ] Double-click word selection triggers the same quick translation flow.
- [ ] Stale popup disappears after changing passages or content mode.
- [ ] Save sends selected text, translation, context, source ID, and target language to `/api/vocabulary`.
- [ ] No custom right-click menu is added in v1.
- [ ] UI breadcrumbs exist for selection, quick translation request/result, details open, and save click with privacy-safe metadata.

## Risk Assessment

Browser selection behavior is hard to unit-test in jsdom. Keep DOM logic small, deterministic, and covered by component tests where possible; add Playwright coverage if jsdom cannot verify real selection behavior.
