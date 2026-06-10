---
phase: 1
title: "Workspace State Contract"
status: pending
priority: P1
effort: "1.5h"
dependencies: []
---

# Phase 1: Workspace State Contract

## Overview

Define one predictable active-passage contract inside `useStudyWorkspaceState`: the newest passage is the default, uploads select themselves, deletes fall back to the newest remaining passage, and filtering/search never affects active state.

## Requirements

- Functional: initialize active state from the newest `PassageData.createdAt` when `initialPassages` is non-empty.
- Functional: preserve active state when uploading errors, closing the modal, searching sources, or deleting a different passage.
- Functional: after deleting the active passage, choose the newest remaining passage or clear active state if no passages remain.
- Non-functional: keep this logic local to the workspace hook; do not introduce persistence or URL state.
- Non-functional: keep behavior deterministic when `createdAt` ties occur by preserving existing array order as the secondary order.

## Architecture

Add a tiny helper in `src/features/study/use-study-workspace-state.ts`, scoped to the file:

```ts
function getMostRecentPassageId(passages: PassageData[]): string | null {
  return passages.reduce<PassageData | null>((latest, passage) => {
    if (!latest) return passage;
    return passage.createdAt > latest.createdAt ? passage : latest;
  }, null)?.id ?? null;
}
```

Use it during initial state creation and after successful active-passage deletion. The existing `documents` memo can keep sorting for display.

## Related Code Files

- Modify: `src/features/study/use-study-workspace-state.ts`
- Modify: `src/features/study/use-study-workspace-state.test.ts`

## Implementation Steps

1. Add `getMostRecentPassageId` or equivalent file-local helper.
2. Change the `useState` initializer so `activePassageId` is `getMostRecentPassageId(initialPassages)` and `status` is `ready` when that ID exists, otherwise `idle`.
3. Keep `handleUploadComplete` selecting the uploaded passage; ensure it clears old errors.
4. In `handleDeletePassage`, compute `remainingPassages` once after server success.
5. If the deleted passage is active, set `activePassageId` to `getMostRecentPassageId(remainingPassages)`, clear questions, and set status based on whether a replacement exists.
6. If the deleted passage is not active, keep current active ID/questions/status and clear stale delete errors.
7. Leave source search in the left panel as local UI state only.

## Success Criteria

- [ ] Initial saved passages select the newest passage without user interaction.
- [ ] Deleting the active passage with another saved passage remaining opens that remaining passage instead of the disconnected empty state.
- [ ] Deleting a non-active passage does not change the active content area.
- [ ] Upload success keeps the uploaded passage active.
- [ ] Source search filtering does not mutate active passage state.

## Risk Assessment

Low risk. The main regression risk is tests or downstream components expecting `activePassageId: null` on initial saved passages. Mitigate by updating hook tests to the new product behavior and preserving `null` only for truly empty passage lists.
