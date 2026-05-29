---
phase: 4
title: "Translate Studio Panel"
status: pending
priority: P2
effort: "4h"
dependencies: [2, 3]
---

# Phase 4: Translate Studio Panel

## Overview

Enable the existing Translate Studio card and add a detailed translation panel in the right-side Studio area.

## Requirements

- Functional: `Open details` switches the right Studio panel to Translate.
- Functional: The Translate card is enabled when an active passage exists.
- Functional: The detailed panel shows selected text, translation, explanation, current-sentence meaning, full sentence translation, examples, related words, optional pronunciation, save, and Ask AI.
- Functional: The panel fetches detailed translation with `mode: "detailed"`.
- Functional: Ask AI opens chat with a prepared/prefilled question about the selected text, but does not automatically submit it.
- Non-functional: Keep the right panel layout consistent with current chat/result views.
- Non-functional: Add Sentry breadcrumbs for opening details, detailed translation lifecycle, save, and Ask AI interactions.

## Architecture

Extend `StudyStudioPanel` with a third active view beside chat and result detail:

- dashboard card grid
- chat view
- generated result view
- translate detail view

The parent passes current selection and quick translation. The panel fetches detailed data as needed, reuses the vocabulary save callback, and uses the existing chat panel for Ask AI when feasible.

Client observability:

- Add breadcrumbs for `study-translation-details-opened`, `study-translation-detailed-request`, `study-translation-detailed-success`, `study-translation-detailed-error`, `study-vocabulary-save-result`, and `study-translation-ask-ai-opened`.
- Metadata must be privacy-safe: source ID, target language, mode, selected/context lengths, response status, and whether the action came from popup or detail panel.
- Do not put raw selected text, context sentence, or translation into breadcrumbs.

## Related Code Files

- Modify: `src/features/study/study-right-panel.tsx`
- Create: `src/features/study/study-translate-panel.tsx`
- Optionally modify: `src/features/study/study-chat-panel.tsx` only if prefilled Ask AI needs a clean prop
- Modify: `messages/en.json`, `messages/vi.json`

## Implementation Steps

1. Add `translate` view state to `StudyStudioPanel`.
2. Enable the existing Translate card when there is an active passage and a current selection; otherwise keep it disabled with accessible disabled state.
3. Add `StudyTranslatePanel` using existing shadcn `Button`, Lucide icons, panel scroll, and compact Studio styling.
4. Fetch detailed translation when the panel opens or selection changes.
5. Add save-to-vocabulary behavior shared with the quick popup.
6. Add Ask AI behavior by opening chat with a prepared question about the selected text; if prefill is too invasive, pass a visible suggested question into the chat view instead. Do not auto-send the message.
7. Add Sentry breadcrumbs around detail open, detailed fetch lifecycle, save result, and Ask AI open.

## Success Criteria

- [ ] `Open details` opens Translate panel for the current selection.
- [ ] Translate panel does not render stale data from a previous passage/selection.
- [ ] Save works from both popup and detail panel.
- [ ] Ask AI opens a useful chat workflow without auto-sending a message or breaking existing study chat history.
- [ ] Existing Quiz, Summary, and Chat Studio actions still work.
- [ ] Detail panel interactions include privacy-safe Sentry breadcrumbs.

## Risk Assessment

The main regression risk is `StudyStudioPanel` state complexity. Keep view selection explicit and avoid changing existing result generation behavior.
