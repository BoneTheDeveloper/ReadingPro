---
phase: 4
title: "Study Quick UI Request Fixes"
status: pending
priority: P1
effort: "4h"
dependencies:
  - 1
  - 2
---

# Phase 4: Study Quick UI Request Fixes

## Overview

Fix remaining Study quick-mode client-side PR feedback after the manual translate trigger exists: popup positioning and double-click selection stability.

## Main Info

- Problem: UI edge cases can still produce clipped popup placement or duplicate selection state even after translation execution becomes manual.
- Resolve: Fix popup above-positioning/clamping and ensure double-click captures one final selection without triggering translate until the icon click.

## Requirements

- Functional: Popup flipped above a bottom-of-viewport selection must render fully above the selection and remain clamped within viewport margins.
- Functional: Double-click selection must capture one final selection and must not trigger quick translation until the icon is clicked.
- Functional: Sentence/paragraph selections must keep their full selected text in `TranslationSelection.selectedText`; UI dedupe must not collapse them to one token.
- Non-functional: Preserve keyboard and mouse dismissal behavior for the popup.
- Non-functional: Preserve existing Study reader support for regular mouse selection and double-click word selection.

## Architecture

Client behavior should be guarded at the component boundaries:

- Popup positioning can use a CSS transform for the above case or a measured/clamped helper.
- Study selection dedupe can key by selected text, context, source id, and a short event window, or avoid handling both `mouseup` and `dblclick` for the same browser gesture.
- Dedupe must operate on the extracted `TranslationSelection` object, not by re-tokenizing selected text. The API owns dictionary versus sentence/paragraph routing.

## Related Code Files

- Modify: `src/features/study/study-translation-popup.tsx`
- Modify: `src/features/study/study-content-panel.tsx`
- Modify/Create: focused component tests under `__tests__/components/study`

## Implementation Steps

1. Fix popup above-position calculation so the popup is positioned with its bottom edge above the selection plus offset.
2. Clamp popup top and left positions to viewport margins to avoid new off-screen cases.
3. Dedupe Study selection handling for double-click so the final word selection is captured once and remains untranslated until icon click.
4. Add a regression test that sentence selection preserves the full highlighted sentence in the quick request body after icon click.
5. Add regression tests for double-click duplicate translate prevention.
6. Add helper-level or component-level coverage for popup flipped positioning.

## Success Criteria

- [ ] Popup is not clipped when selection is near the viewport bottom.
- [ ] Double-click sends zero `/api/translate` requests before the translate icon is clicked.
- [ ] Sentence selection sends the full selected text, not only the first word, after the icon click.
- [ ] Existing selection, dismiss, and details flows still pass.
- [ ] Save vocabulary is not rendered from the quick popup.

## Risk Assessment

Browser selection events are timing-sensitive. Prefer tests around observable behavior, not implementation internals, and avoid changes that make normal drag selection less responsive.
