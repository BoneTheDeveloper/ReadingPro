# Phase 02: Left Panel — Upload + Content Reading (ENG-6)

**Priority:** High | **Status:** Pending | **Dependencies:** Phase 01

---

## Context

- Linear: [ENG-6](https://linear.app/english-reading-app/issue/ENG-6/implement-left-panel-upload-content-reading-view)
- Replaces: `upload/page.tsx`, `processing/page.tsx`, `reading/[id]/reading-view-client.tsx`

## Key Insights

- `UploadZone` and `TextInputArea` are self-contained components — reuse directly with callback props
- Current `analyzeContentAction` takes `FormData`, returns `{ passageId, ... }` — needs enhancement to return full data for single-page flow
- Current processing page is FAKE (simulated progress with setInterval) — replace with real loading state
- `ReadingViewClient` is 164 lines, includes navigation buttons and "Start Test" button — strip these for panel embedding
- The reading view's original/simplified toggle logic is clean and reusable

## Requirements

- **Upload state**: File/text toggle, drag-drop or paste, validation
- **Processing state**: Real loading indicator (no fake progress)
- **Reading state**: Original/simplified toggle, CEFR badge, word count, reading time

## Architecture

```
study-left-panel.tsx
├── status === 'idle' || 'error'    → UploadUI (UploadZone + TextInputArea)
├── status === 'uploading'           → UploadZone with isProcessing
├── status === 'analyzing'           → ProcessingIndicator
└── status === 'ready'               → ReadingView (passage content)
```

Upload flow:
1. User selects file or pastes text
2. If file (PDF): extract text client-side via API, then call `studyAnalyzeAction`
3. If text: call `studyAnalyzeAction` directly
4. On success: parent state updates to `ready` with passage + questions
5. On error: parent state updates to `error`

## Files to Modify

| File | Change |
|------|--------|
| `src/app/(dashboard)/study/study-left-panel.tsx` | Implement 3 states |
| `src/app/actions/analyze.ts` | Add `studyAnalyzeAction` returning full passage + questions |

## Files to Reference (Read-Only)

- `src/components/upload-zone.tsx` — Reuse directly (props: `onFileSelect`, `isProcessing`, `disabled`)
- `src/components/text-input-area.tsx` — Reuse directly (props: `onSubmit`, `isProcessing`, `disabled`)
- `src/app/(dashboard)/reading/[id]/reading-view-client.tsx` — Adapt reading view logic
- `src/lib/reading-utils.ts` — `calculateReadingTime()`
- `src/lib/cefr-utils.ts` — `getCEFRColor()`, `getCEFRLabel()`

## Implementation Steps

1. **Add `studyAnalyzeAction` to `analyze.ts`**:
   - Takes `{ text: string, title: string }` as input
   - Runs same pipeline as existing `analyzeContentAction` (CEFR → simplify → questions)
   - Returns `{ passage: { id, title, content, simplifiedContent, originalLevel, simplifiedLevel, wordCount }, questions: [...] }`
   - Create passage + questions in DB (same as existing)
   - Return full data instead of just passageId

2. **Implement upload state in `study-left-panel.tsx`**:
   - File/text toggle (same pattern as `upload/page.tsx`)
   - Render `UploadZone` or `TextInputArea` based on toggle
   - On file select: upload via `/api/upload`, then call `studyAnalyzeAction`
   - On text submit: call `studyAnalyzeAction` directly
   - Pass `isProcessing` to disable components during upload

3. **Implement processing state**:
   - Simple centered spinner + "Analyzing content..." text
   - No fake progress bar — just a clean loading indicator
   - Use `Loader2` icon from lucide-react (already used in existing components)

4. **Implement reading state**:
   - Adapted from `ReadingViewClient` but:
     - No router navigation buttons
     - No "Start Test" / "Take the Test" buttons
     - No `min-h-screen` wrapper (panel content only)
     - Original/simplified toggle (reuse same pattern)
     - CEFR badge, word count, reading time metadata bar
     - Font-serif paragraph rendering

## Todo Checklist

- [ ] Add `studyAnalyzeAction` to `analyze.ts`
- [ ] Implement upload state (file/text toggle + validation)
- [ ] Implement processing state (loading indicator)
- [ ] Implement reading state (content display + toggle)
- [ ] Wire callbacks to parent state management
- [ ] Error handling: show error message, allow retry

## Success Criteria

- File upload (txt/pdf) works within the panel
- Text paste works within the panel
- Validation rejects invalid files/text with clear messages
- Processing shows real loading state
- After analysis: reading view shows with original/simplified toggle
- CEFR badge, word count, reading time displayed
- Panel scrolls independently
- No page navigation occurs
