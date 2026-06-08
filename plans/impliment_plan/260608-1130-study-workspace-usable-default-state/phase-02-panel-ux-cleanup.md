---
phase: 2
title: "Panel UX Cleanup"
status: pending
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 2: Panel UX Cleanup

## Overview

Make the visible workspace match implemented functionality. Empty state should lead to adding a source, and fake controls should be removed or clearly disabled so the first learner flow does not feel like a draft.

## Requirements

- Functional: content empty state gives a direct add-source action that opens the existing upload modal.
- Functional: left panel empty state remains clear and concise in expanded mode.
- Functional: unimplemented batch select/select all, rename, full-passage translate, bookmark, and share controls should not appear as working controls.
- Non-functional: preserve three-panel layout, existing upload modal, quick selection translation popup, simplify action, and locale messages.
- Non-functional: keep UI compact and consistent with the current shadcn/lucide style.

## Architecture

Pass the existing `handleOpenUploadModal` callback from `StudyPageClient` into `StudyContentPanel` as `onOpenUploadModal`. Add a CTA button only in the no-passage state. Do not add a new upload path.

Simplify `StudySourcesPanel` by removing local checkbox selection state and the select-all row because no batch operation consumes it. Keep delete as the only active document menu action. Remove the disabled rename menu item rather than surfacing a dead feature.

Remove the content footer actions that have no handlers. Keep implemented content controls: simplify, original/simplified toggle, metadata, text selection translation.

## Related Code Files

- Modify: `src/features/study/study-page-client.tsx`
- Modify: `src/features/study/study-left-panel.tsx`
- Modify: `src/features/study/study-content-panel.tsx`
- Modify: `localization/messages/en.json`
- Modify: `localization/messages/vi.json`

## Implementation Steps

1. Add an `onOpenUploadModal` prop to `StudyContentPanelProps`.
2. In `StudyPageClient`, pass `handleOpenUploadModal` into `StudyContentPanel`.
3. In the `!passage` branch of `StudyContentPanel`, render an `Add Source` button wired to `onOpenUploadModal`; reuse existing `Study.addSource` copy unless more specific copy is needed.
4. Remove unused imports from `study-content-panel.tsx` after dropping footer actions (`Bookmark`, `Share2`, and any now-unused icons).
5. Remove `selectedIds`, `allSelected`, `toggleSelectAll`, `toggleSelect`, checkbox UI, and the select-all row from `StudySourcesPanel`.
6. Remove the disabled rename menu item and separator if delete is the only remaining menu action.
7. Keep source title search and no-match copy intact.
8. Update localization only for any new empty-state CTA/help text that cannot reuse existing keys.

## Success Criteria

- [ ] Empty `/study` state has a visible add-source action in the content panel.
- [ ] Source list no longer shows select-all or per-source checkboxes with no batch action.
- [ ] Source menu no longer advertises disabled rename as part of the core loop.
- [ ] Content panel no longer shows full-passage translate, bookmark, or share buttons without implementation.
- [ ] Implemented actions still work: add source, delete source, select source, simplify where available, quick selection translation.

## Risk Assessment

Low-medium risk because this removes UI. Mitigate by keeping all implemented controls and avoiding copy churn. If product wants placeholders later, they should return with disabled styling plus explicit roadmap context outside this P1 core loop.
