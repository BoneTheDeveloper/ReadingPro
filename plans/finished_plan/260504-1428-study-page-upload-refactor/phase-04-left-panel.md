---
title: "Phase 4: Refactor Left Panel"
description: "Update left panel to trigger upload modal and show loading shimmer on new cards"
status: pending
priority: P1
effort: 1h
branch: main
tags: [left-panel, sources, modal-trigger]
created: 2026-05-04
---

## Context Links
- Plan: [plan.md](./plan.md)
- Types: [phase-02-update-types.md](./phase-02-update-types.md)
- Modal: [phase-03-upload-modal.md](./phase-03-upload-modal.md)
- Current file: `src/app/(dashboard)/study/study-left-panel.tsx` (85 lines)

## Overview
Update `StudySourcesPanel` to trigger the upload modal when "Add New Document" is clicked (instead of clearing activePassageId). Add shimmer loading state for newly-uploaded documents.

## Current Behavior
- "Add New Document" button calls `onAddNew()` which sets `activePassageId: null`
- Document cards show title, date, level -- no loading state

## Required Changes

### Props Interface Update
```typescript
// OLD
interface StudySourcesPanelProps {
  documents: DocumentItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAddNew: () => void;
}

// NEW
interface StudySourcesPanelProps {
  documents: DocumentItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenUploadModal: () => void;  // renamed
  isUploading?: boolean;          // show shimmer on newest card
}
```

### UI Changes
1. "Add New Document" button → calls `onOpenUploadModal()` instead of `onAddNew()`
2. When `isUploading` is true, show a shimmer placeholder card at top of document list
3. Card structure unchanged for loaded documents

### Shimmer Card Pattern
```
<div className="animate-pulse p-4 rounded-xl border">
  <div className="h-4 w-3/4 bg-outline-variant/20 rounded" />  <!-- title -->
  <div className="h-3 w-1/2 bg-outline-variant/20 rounded mt-2" />  <!-- subtitle -->
</div>
```

## Implementation Steps

1. Update `StudySourcesPanelProps` — replace `onAddNew` with `onOpenUploadModal`, add `isUploading`
2. Update button `onClick` from `onAddNew` to `onOpenUploadModal`
3. Add shimmer card: when `isUploading`, render a pulsing placeholder before the document list
4. Keep existing empty state and document list logic unchanged
5. File stays well under 200 lines (currently 85, adding ~15 lines for shimmer)

## Todo List
- [ ] Update props interface
- [ ] Replace `onAddNew` with `onOpenUploadModal`
- [ ] Add shimmer card when `isUploading`
- [ ] Verify compilation

## Success Criteria
- "Add New Document" triggers upload modal (not clear activePassageId)
- Shimmer card appears during upload
- Existing document list behavior unchanged
- File under 100 lines

## Risk Assessment
| Risk | Mitigation |
|------|-----------|
| Breaking parent component (renamed prop) | Phase 7 updates parent to match |

## Next Steps
- Phase 7: Client rewire passes new props to left panel
