---
phase: 1
title: "Contract and UX Cleanup"
status: pending
priority: P1
effort: "4h"
dependencies: []
---

# Phase 1: Contract and UX Cleanup

## Overview

Define the fast-only product contract in UI terms before changing backend behavior. The app should have one translate action and dictionary-based detail, not quick vs detailed translation.

## Requirements

- Functional: Keep manual translate trigger from the floating icon.
- Functional: Remove user-facing detailed translation behavior from `/study`.
- Functional: Keep vocabulary save available from the fast result.
- Non-functional: Do not add new AI calls or background prefetch.

## Architecture

The study page should keep one selected-text state and one fast translation state. The old detail panel should either disappear or become a dictionary lookup/detail surface using the selected text.

## Related Code Files

- Modify: `src/features/study/study-page-client.tsx`
- Modify: `src/features/study/study-translation-popup.tsx`
- Modify: `src/features/study/study-right-panel.tsx`
- Modify/Delete: `src/features/study/study-translate-panel.tsx`

## Implementation Steps

1. Rename UI concepts from quick/detailed to fast translation/dictionary detail.
2. Move Save vocabulary into the fast translation popup or a non-AI side panel state.
3. Replace Open Details behavior with Open Dictionary behavior for selected text.
4. Remove auto detailed translation fetch on opening the right panel.
5. Keep Ask AI separate in study chat if still needed, with no translate-side auto send.

## Success Criteria

- [ ] Selecting text still shows the floating translate icon.
- [ ] Clicking the icon still fetches and displays the fast translation.
- [ ] No UI action triggers detailed AI translation.
- [ ] Save vocabulary remains available after successful fast translation.
- [ ] More detail opens dictionary lookup/search for the selected text.

## Risk Assessment

Risk: Removing the detail panel can hide the vocabulary save action.
Mitigation: Move save into the fast result UI before deleting detailed panel behavior.
