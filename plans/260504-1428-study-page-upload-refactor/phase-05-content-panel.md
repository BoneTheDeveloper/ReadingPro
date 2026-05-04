---
title: "Phase 5: Refactor Content Panel"
description: "Remove upload UI, add empty state, add Simplify button"
status: pending
priority: P1
effort: 1.5h
branch: main
tags: [content-panel, simplify, empty-state]
created: 2026-05-04
---

## Context Links
- Plan: [plan.md](./plan.md)
- Types: [phase-02-update-types.md](./phase-02-update-types.md)
- Server actions: [phase-01-split-server-actions.md](./phase-01-split-server-actions.md)
- Current file: `src/app/(dashboard)/study/study-content-panel.tsx` (244 lines)

## Overview
Remove the upload/file-text-paste UI from the content panel. Add an empty state for when no passage is selected. Add an on-demand "Simplify" button in the controls bar. Show view toggle (Original/Simplified) after simplification.

## Current Behavior (3 states)
1. `status === 'analyzing'` → loading spinner
2. `status === 'ready' && passage` → reading view with controls
3. Default (idle/error) → **upload UI** (file/text toggle + UploadZone + TextInputArea)

## Required Changes

### Props Interface Update
```typescript
// OLD
interface StudyContentPanelProps {
  status: StudyStatus;
  passage: PassageData | null;
  error: string | null;
  onAnalyze: (text: string, title: string) => void;
}

// NEW
interface StudyContentPanelProps {
  passage: PassageData | null;
  error: string | null;
  simplifying: boolean;
  onSimplify: () => void;
}
```

### Three New States

1. **No passage selected** (`!passage`) → Empty state:
   ```
   Icon (FileText)
   "Select a document from Sources to start reading"
   ```
   Subtitle: "Choose from your recent documents or add a new one"

2. **Passage selected, no simplification** → Reading view with Simplify button:
   - Top controls bar: CEFR badge | reading time | word count | **Simplify button**
   - Simplify button: `Languages` icon, "Simplify" text, primary style
   - Show original content

3. **Passage selected, simplified** → Reading view with view toggle:
   - Top controls bar: **Original/Simplified toggle** | CEFR badge | reading time | word count
   - Toggle shows level for each: "Original (B2)" / "Simplified (B1)"
   - Same as current view toggle behavior (lines 109-133)

### Simplify Button Behavior
- Only shown when `passage.simplifiedContent === null` (not yet simplified)
- **Hidden entirely for A1/A2 texts** (already at simplest level)
- Disabled when `simplifying === true` → shows spinner
- On click: calls `onSimplify()` (parent handles the action call)
- Simplifying does NOT affect existing questions (questions stay, user can regenerate separately)

## Implementation Steps

1. Remove all upload-related state and handlers:
   - Remove `InputMode` type, `viewMode` state (keep for toggle, see below)
   - Remove `inputMode` state, `isUploading` state
   - Remove `handleFileUpload`, `handleTextSubmit`
   - Remove imports: `UploadZone`, `TextInputArea`, `Upload`, `Type`

2. Update props interface — remove `status`, `onAnalyze`; add `simplifying`, `onSimplify`

3. Add empty state component (when `!passage`):
   ```tsx
   <div className="flex items-center justify-center h-full">
     <div className="text-center">
       <FileText icon with muted style />
       <p>Select a document from Sources to start reading</p>
     </div>
   </div>
   ```

4. Update reading view controls bar:
   - If `passage.simplifiedContent` exists: show view toggle (keep current logic from lines 109-133)
   - If not: show Simplify button
   - CEFR badge, reading time, word count remain unchanged

5. Simplify button implementation:
   ```tsx
   <button onClick={onSimplify} disabled={simplifying}>
     {simplifying ? <Loader2 className="animate-spin" /> : <Languages />}
     {simplifying ? 'Simplifying...' : 'Simplify'}
   </button>
   ```

6. Keep the analyzing/loading state as a separate case (passage selected but `status === 'analyzing'` or `simplifying`)

7. File size target: ~150 lines (removing ~60 lines of upload UI, adding ~30 lines of empty state + simplify button)

## Todo List
- [ ] Remove upload UI (InputMode, inputMode state, handleFileUpload, handleTextSubmit, UploadZone, TextInputArea)
- [ ] Update props interface
- [ ] Add empty state for no passage selected
- [ ] Add Simplify button in controls bar
- [ ] Keep view toggle logic for already-simplified passages
- [ ] Verify file under 200 lines

## Success Criteria
- No upload UI in content panel
- Empty state shows when no passage selected
- Simplify button triggers `onSimplify` callback
- View toggle works after simplification
- Loading spinner on Simplify button during processing
- File under 200 lines

## Risk Assessment
| Risk | Mitigation |
|------|-----------|
| Removing `status` prop breaks parent | Phase 7 updates parent to match |
| Simplify shown for A1/A2 (already simple) | Hide button entirely for A1/A2 — check `originalLevel` before rendering |
| View toggle missing after simplify | Parent updates passage in state with new simplifiedContent |

## Next Steps
- Phase 7: Client rewire passes new props to content panel
