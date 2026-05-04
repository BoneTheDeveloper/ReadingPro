---
title: "Phase 3: Upload Modal Component"
description: "Create modal overlay component for upload over left panel"
status: pending
priority: P1
effort: 1h
branch: main
tags: [modal, upload, component]
created: 2026-05-04
---

## Context Links
- Plan: [plan.md](./plan.md)
- Types: [phase-02-update-types.md](./phase-02-update-types.md)
- Reuse: `src/components/upload-zone.tsx`, `src/components/text-input-area.tsx`

## Overview
Create `study-upload-modal.tsx` — a modal overlay that appears over the left panel when "Add New Document" is clicked. Contains file/text toggle, reuses existing `UploadZone` and `TextInputArea` components.

## Requirements

### Functional
- Modal overlay with backdrop, positioned over left panel area
- Toggle between file upload and text paste (same pattern as current content panel)
- File upload: validate file, extract text, call `studyUploadAction`
- Text paste: validate text, call `studyUploadAction`
- Show loading state during CEFR detection + DB save
- On success: close modal, pass passage data back to parent
- On error: show error in modal, keep modal open
- Close button (X) and backdrop click to dismiss

### UI/UX
- Deep Indigo theme (consistent with existing study page)
- Smooth open/close transition
- File drop zone + text input area reuse existing components
- Loading spinner during processing

## Architecture

### Component Structure
```
StudyUploadModal
├── Backdrop (click to close)
├── Modal container (fixed position, z-50)
│   ├── Header: "Add New Document" + X close button
│   ├── Toggle: Upload File | Paste Text
│   ├── Content area:
│   │   ├── UploadZone (file mode) OR TextInputArea (text mode)
│   │   └── Error display
│   └── Footer: Cancel button
```

### Data Flow
```
User provides content → Modal calls studyUploadAction(text, title)
→ On success: onUploadComplete(passage) → parent adds to state → modal closes
→ On error: show error in modal
```

## Related Code Files
- **Create:** `src/app/(dashboard)/study/study-upload-modal.tsx`
- **Read-only:** `src/components/upload-zone.tsx`, `src/components/text-input-area.tsx`
- **Import from:** Phase 1 server actions

## Implementation Steps

1. Create `study-upload-modal.tsx` with `'use client'` directive
2. Accept `StudyUploadModalProps` from study-types.ts
3. Implement modal overlay:
   - Fixed position container covering left panel area (w-[280px] or full overlay)
   - Backdrop with `bg-black/50`
   - White card with rounded corners, shadow
4. Add file/text toggle (reuse toggle button pattern from current content panel lines 194-219)
5. Wire up `UploadZone` for file mode:
   - `onFileSelect` → extract text from file → call `studyUploadAction`
6. Wire up `TextInputArea` for text mode:
   - `onSubmit` → call `studyUploadAction`
7. Handle loading state: disable inputs, show spinner
8. Handle result:
   - Success: call `onUploadComplete(passage)`, then `onClose()`
   - Error: set local error state, display to user
9. File size target: ~120-150 lines

## Todo List
- [ ] Create `study-upload-modal.tsx`
- [ ] Implement modal overlay with backdrop
- [ ] Add file/text toggle
- [ ] Wire UploadZone + TextInputArea
- [ ] Handle loading state
- [ ] Handle success/error callbacks
- [ ] Verify under 200 lines

## Success Criteria
- Modal opens/closes smoothly
- File upload triggers `studyUploadAction`, shows loading
- Text paste triggers `studyUploadAction`, shows loading
- Success closes modal and passes passage data
- Error keeps modal open with error message
- Reuses existing `UploadZone` and `TextInputArea` (DRY)
- File under 200 lines

## Risk Assessment
| Risk | Mitigation |
|------|-----------|
| Modal z-index conflicts | Use z-50, same level as other overlays |
| File too large for inline text extraction | Validate in UploadZone (existing validation handles this) |
| studyUploadAction returns error | Display error, keep modal open |

## Next Steps
- Phase 4: Left panel triggers this modal
