# Phase 04: End-to-End Integration (ENG-8)

**Priority:** High | **Status:** Pending | **Dependencies:** Phase 02, Phase 03

---

## Context

- Linear: [ENG-8](https://linear.app/english-reading-app/issue/ENG-8/wire-upload-analysis-test-flow-end-to-end)
- This phase connects left panel (Phase 02) and right panel (Phase 03) via shared state

## Key Insights

- Shared state already defined in `study-page-client.tsx` from Phase 01
- `studyAnalyzeAction` from Phase 02 returns full passage + questions
- Left panel calls analyze action → updates parent state → right panel reacts
- The integration is primarily about wiring callbacks correctly

## Requirements

- Full flow: upload → analyze → read + test on single page
- Both panels update from shared analysis state
- Error handling: validation, AI, network failures
- User can upload new content to reset both panels

## Architecture

State flow:
```
Left Panel (upload click)
  → calls onAnalyze(text, title) callback
  → parent sets status='analyzing'
  → parent calls studyAnalyzeAction()
  → on success: sets passage + questions + status='ready'
  → Left panel switches to reading view
  → Right panel switches to test view

Right Panel (onReset click)
  → calls onReset() callback
  → parent clears state: passage=null, questions=[], status='idle'
  → Left panel switches back to upload view
  → Right panel switches back to empty state
```

## Files to Modify

| File | Change |
|------|--------|
| `src/app/(dashboard)/study/study-page-client.tsx` | Wire callbacks, handle analyze action, error handling |
| `src/app/(dashboard)/study/study-left-panel.tsx` | Connect to parent state/callbacks |
| `src/app/(dashboard)/study/study-right-panel.tsx` | Connect to parent state/callbacks |

## Implementation Steps

1. **Wire `studyAnalyzeAction` call in `study-page-client.tsx`**:
   - Create `handleAnalyze(text, title)` async function
   - Set `status='analyzing'` before call
   - Call `studyAnalyzeAction({ text, title })`
   - On success: set `passage`, `questions`, `status='ready'`
   - On error: set `status='error'`, `error=message`

2. **Wire callbacks to left panel**:
   - Pass `onAnalyze={handleAnalyze}` prop
   - Pass `status` prop for internal state management
   - Pass `passage` prop for reading view data

3. **Wire props to right panel**:
   - Pass `questions` prop
   - Pass `passageContent` and `passageTitle` for source citations
   - Pass `onReset` callback that clears all state

4. **Error handling**:
   - Upload validation errors → shown in left panel (already handled by UploadZone/TextInputArea)
   - AI analysis failure → try/catch in handleAnalyze, set error state
   - Network errors → same catch block
   - Error state shows error message in left panel with "Try Again" option

5. **Reset flow**:
   - Right panel complete state "New Passage" button → `onReset()`
   - Left panel reading state could have a "New Passage" button too
   - Reset: `{ passage: null, questions: [], status: 'idle', error: null }`

## Todo Checklist

- [ ] Implement `handleAnalyze` in study-page-client.tsx
- [ ] Wire onAnalyze callback to left panel
- [ ] Wire questions + passage props to right panel
- [ ] Implement onReset callback
- [ ] Error handling for analysis failures
- [ ] Test full flow: upload → analyze → read + test
- [ ] Test reset flow: new content clears both panels

## Success Criteria

- Full end-to-end flow works without page navigation
- Both panels update from shared state after analysis
- Error states handled gracefully
- Reset flow clears both panels
- No console errors
