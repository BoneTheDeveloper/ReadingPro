---
phase: 1
title: "Manual Translate Trigger UX"
status: pending
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: Manual Translate Trigger UX

## Overview

Change Study inline translation from auto-trigger-on-highlight to an explicit learner action: highlighting text renders a floating translate icon, and quick translation starts only when the icon is clicked.

## Main Info

- Problem: Current selection flow immediately calls `/api/translate` when text is highlighted, which creates surprise network work and makes accidental selection expensive/noisy.
- Resolve: Keep automatic selection capture, but render a compact `Languages` icon button near the selected text. Move the quick translation fetch into an explicit click handler.

## Requirements

- Functional: Highlighting valid text captures `TranslationSelection` and renders a floating translate icon.
- Functional: Highlighting text must not call `/api/translate`.
- Functional: Clicking the translate icon must call quick `/api/translate` for the current selection, leaving server-side quick mode to decide dictionary versus sentence/paragraph translation.
- Functional: Loading, success, error, and optional `Open details` states must still work after click.
- Functional: The quick popup must not render a Save vocabulary action and must not call `/api/vocabulary`.
- Functional: Changing passage or original/simplified view clears pending selection and untranslated state.
- Non-functional: Preserve quick mode contract: no AI call in quick mode.
- Non-functional: Do not add client-side fields for selection scope; keep `/api/translate` request shape stable.
- Non-functional: Preserve keyboard Escape and outside-click dismissal behavior.

## Architecture

Split selection capture from translation execution:

- `handleSelectionChange(selection)` only updates selection state, clears old quick result, and sets an untranslated/ready state.
- `handleQuickTranslate()` performs the existing quick translation fetch and stale-response guard. It always sends `mode: "quick"` and the selected text/context; the route decides whether the selection is a short dictionary lookup or sentence/paragraph translation.
- `StudyTranslationPopup` renders an icon-only translate action while ready/untranslated, then renders loading/result/error states after click.
- Same-selection in-flight dedupe should prevent rapid repeated clicks from sending duplicate quick requests before the first request resolves.

State shape should make the UX explicit, for example:

```ts
type QuickTranslationStatus = "idle" | "ready" | "loading" | "success" | "error";
```

## Related Code Files

- Modify: `src/features/study/study-page-client.tsx`
- Modify: `src/features/study/study-translation-popup.tsx`
- Modify: `messages/en.json`
- Modify: `messages/vi.json`
- Modify: `__tests__/components/study/study-page-client.integration.test.tsx`

## Implementation Steps

1. Replace auto-fetch in `handleSelectionChange` with selection capture and quick state reset to `ready`.
2. Add `handleQuickTranslate` that contains the existing quick `/api/translate` request logic.
3. Add a same-selection request key/in-flight guard so repeated icon clicks for the same selection do not trigger duplicate quick requests.
4. Pass `onTranslate` and status/loading data into `StudyTranslationPopup`.
5. Update `StudyTranslationPopup` to render a compact `Languages` icon button before translation starts.
6. Update result UI after success to show selected text preview, translation, and `Open details` if still supported; remove the Save vocabulary action from the quick popup.
7. Add/update translations for the icon aria label/tooltip, such as `Translate selection`.
8. Update component tests so highlighting alone does not call `/api/translate`, and clicking the icon does.

## Success Criteria

- [ ] Highlighting text renders a translate icon.
- [ ] Highlighting text sends zero `/api/translate` requests.
- [ ] Clicking the translate icon sends one quick `/api/translate` request.
- [ ] Rapid repeated clicks for the same selection do not send duplicate in-flight quick requests.
- [ ] Quick translation result does not render Save vocabulary.
- [ ] Quick translation flow does not call `/api/vocabulary`.
- [ ] Existing detailed translation flow still works after quick translation succeeds.
- [ ] Escape/outside-click dismissal still clears the popup.

## Risk Assessment

The main risk is breaking existing tests that assumed auto-trigger behavior. Update those tests to match the new explicit-trigger UX instead of preserving the old behavior.
