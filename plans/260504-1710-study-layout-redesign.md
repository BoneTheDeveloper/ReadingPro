# Study Page Layout Redesign — NotebookLM Style

## Context
Redesign the study page to match the NotebookLM-style three-panel layout shown in the reference image. Keep existing color scheme (light theme with blue accents) and three-panel structure. Key changes: left panel gets search + checkboxes, right panel becomes a grid of action cards instead of tabs.

## Target Design (from image)
- **Left Panel**: "Sources" header, "Add source" button, search bar, select-all checkbox, document list with per-item checkboxes and source-type icons
- **Center Panel**: Reading content (mostly unchanged)
- **Right Panel**: "Studio" header, grid of action template cards (Quiz, Summary, Flashcards, Mind Map, etc.) — no tabs

## Changes

### 1. Left Panel (`study-left-panel.tsx`)
- Add search input at top (below header)
- Add "Select all" checkbox
- Add per-document checkbox
- Add source-type icon (FileText for docs)
- Add document count badge on header
- Keep existing Add button and document selection behavior

### 2. Right Panel (`study-right-panel.tsx`)
- **Remove** Q&A/Generate tabs
- Replace with a grid of action cards:
  - Quiz (test icon) — opens quiz when questions exist
  - Flashcards (layers icon) — placeholder for future
  - Summary (file-text icon) — triggers simplify
  - Mind Map (git-branch icon) — placeholder
  - Translate (languages icon) — placeholder
- Each card: icon, label, short description
- Active card (quiz) expands into the quiz content inline
- Keep existing generate questions functionality via the Quiz card

### 3. Types (`study-types.ts`)
- Add `StudioCard` type for card definitions
- No breaking changes to existing types

### 4. Client Orchestrator (`study-page-client.tsx`)
- Update `StudyStudioPanel` props (remove tab logic, add card selection state)
- Minor prop adjustments only

## Files to Modify
1. `src/app/(dashboard)/study/study-left-panel.tsx` — search + checkboxes
2. `src/app/(dashboard)/study/study-right-panel.tsx` — card grid layout
3. `src/app/(dashboard)/study/study-types.ts` — add StudioCard type
4. `src/app/(dashboard)/study/study-page-client.tsx` — update props

## Files NOT Modified
- `study-content-panel.tsx` — center panel stays the same
- `study-quiz-content.tsx` — quiz component reused inside right panel
- `study-upload-modal.tsx` — upload modal unchanged

## Verification
1. `npx tsc --noEmit` — TypeScript compilation
2. Visual check: three panels render correctly with new layout
3. Existing functionality preserved: upload, simplify, quiz generation, document selection
