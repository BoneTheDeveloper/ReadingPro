---
title: "Phase 3: Upload flow refactor"
status: completed
priority: P1
effort: "0.5d"
dependencies: ["phase-02-artifact-async-status"]
---

# Phase 3: Upload flow refactor

## Overview

Now that passages carry their own async status (Phases 1+2), `useUploadFlow` collapses to **modal open/close state only**. The `uploadingFileName` string tracker, `start/complete/fail/clearError` callbacks, and error-state-on-workspace pattern are all dead weight — pending and error UX now lives in `SourcesPanel` reading from `usePassageLibrary` data.

## Why This Phase Is Last

Phases 1+2 replace *what* `useUploadFlow` was tracking (async state) with server data. After that, the hook still has modal state, which is fine. This phase removes the now-redundant async-tracking surface and fixes the error UX half-life.

## Requirements

- [ ] `useUploadFlow` exposes only `isModalOpen`, `openModal`, `closeModal`
- [ ] `UploadModal.submit` calls a single `onCreated(passage)` callback (not start/complete/fail)
- [ ] `UploadModal` calls `useCreatePassage` directly; workspace no longer orchestrates
- [ ] `SourcesPanel` reads pending/error from `library.passages` (server data)
- [ ] Failed passage rows show error message (no retry — user can delete via existing DELETE)
- [ ] `pnpm typecheck && pnpm lint && pnpm knip` clean

## Architecture

### Before
```typescript
// useUploadFlow (workspace-level)
const upload = useUploadFlow(library.upsert);
// tracks: uploadingFileName, error, isUploading (derived)
// methods: start, complete, fail, clearError

// UploadModal
useCreatePassage()  // owns mutation
mutation.mutate(input, {
  onSuccess: onUploadComplete,
  onError: (err) => onUploadError?.(err.message),
});

// Workspace passes:
<UploadModal
  onUploadStart={upload.start}
  onUploadComplete={upload.complete}
  onUploadError={upload.fail}
/>
<SourcesPanel
  pendingUpload={upload.uploadingFileName ? { title } : null}
  uploadError={upload.error}
  onClearUploadError={upload.clearError}
/>
```

### After
```typescript
// useUploadFlow (workspace-level) — modal only
const upload = useUploadFlow();
// tracks: isModalOpen
// methods: openModal, closeModal

// UploadModal — owns mutation lifecycle
useCreatePassage()
mutation.mutate(input, { onSuccess: onCreated });
// onCreated: library.select(passage.id) + upload.closeModal()

// SourcesPanel — reads everything from server data
<SourcesPanel
  passages={library.passages}    // includes status per row
  activeId={library.activeId}
  onSelect={library.select}
  onDelete={library.remove}
/>
```

### SourcesPanel render (per row)
```tsx
{library.passages.map(p => {
  if (p.status === "PENDING")   return <PendingRow title={p.title} />;
  if (p.status === "FAILED")    return <FailedRow title={p.title} error={p.statusError} />;
  return <ReadyRow title={p.title} active={p.id === activeId} onSelect={...} />;
})}
```

## Related Code Files

**Modify:**
- `src/features/passage/hook/use-upload-flow.ts` — strip to modal-only
- `src/features/passage/component/model/upload-modal.tsx` — drop callback props, own mutation + onCreated
- `src/app/(dashboard)/study/_component/study-workspace.tsx` — drop pendingUpload/uploadError wiring
- `src/features/passage/component/panel/sources-panel.tsx` — drop pendingUpload/uploadError/onClearUploadError props, render from passages data
- `src/features/passage/hook/use-passage-library.ts` — confirm `passages` returns the full Passage (including status) not a stripped list item

**Delete:**
- None (cleanup only, no file removal this phase)

## Implementation Steps

1. **Slim `useUploadFlow`** to:
   ```typescript
   export function useUploadFlow() {
     const [isModalOpen, setIsModalOpen] = useState(false);
     return {
       isModalOpen,
       openModal: useCallback(() => setIsModalOpen(true), []),
       closeModal: useCallback(() => setIsModalOpen(false), []),
     };
   }
   ```

2. **Refactor `UploadModal`**:
   - Replace `onUploadStart`/`onUploadComplete`/`onUploadError` props with single `onCreated?: (passage: Passage) => void`
   - `submit()` calls `mutation.mutate(input, { onSuccess: onCreated })`
   - Drop the `onClose(); onUploadStart?.(...)` pattern — let `onCreated` close the modal
   - Internal: remove the modal-close-before-mutate sequencing; close on success only

3. **Update `StudyWorkspace`**:
   - `<UploadModal isOpen={upload.isModalOpen} onClose={upload.closeModal} onCreated={(p) => { library.select(p.id); upload.closeModal(); }} />`
   - Remove `pendingUpload` and `uploadError`/`onClearUploadError` from `SourcesPanel` props

4. **Update `SourcesPanel`**:
   - Remove `pendingUpload`, `uploadError`, `onClearUploadError` props
   - Iterate `items: library.passages` (already done)
   - Render each item based on `passage.status`:
     - `PENDING` → spinner + title, no select action
     - `FAILED` → title + error message, deletable
     - `COMPLETED` → title, click to select, delete action

5. **Verify**: typecheck, lint, knip. Manual: upload success/fail flows.

## Success Criteria

- [ ] `useUploadFlow` returns only `{ isModalOpen, openModal, closeModal }`
- [ ] No `uploadingFileName`, `error`, `start`, `complete`, `fail`, `clearError` in the hook
- [ ] `UploadModal` owns its own mutation lifecycle (single `onCreated` callback)
- [ ] Failed passage rows render with error message (no retry — use existing `library.remove`)
- [ ] Workspace no longer passes pending/error props to `SourcesPanel`
- [ ] `pnpm typecheck && pnpm lint && pnpm knip` clean

## Risk Assessment

- **Lost flow on workspace simplification**: if any other component relied on `uploadingFileName`, break. Verify by grep — only `SourcesPanel` and `StudyWorkspace` use it.
- **`onCreated` ordering**: modal must close AFTER navigation. Currently the order in `UploadModal` is `onClose(); onUploadStart?.()` — flipping to "close on success" changes UX slightly. Verify with manual test.
- **No retry surface**: users with failed passages can only delete + re-upload. Acceptable per validation decision. Future plan can add retry if needed.

## Acceptance Tests

```typescript
// Manual
1. Open upload modal, submit text → modal closes, new passage in PENDING then COMPLETED
2. Submit then refresh during AI → PENDING UI preserved, completes
3. Force AI failure → passage shows FAILED with error message
4. Delete the failed passage via existing flow → row removed
5. Open modal twice in quick succession → second open blocked (still works via isModalOpen guard)
6. No client-side pending state in DevTools React profiler (verify by removing the hook and ensuring nothing else tracks it)
7. TypeScript, lint, knip pass
```

## Supersedes

This phase, combined with Phase 1+2, fully replaces the previous plan `260801-2109-artifact-pending-state` (mutation-state watcher approach). Archive that plan after Phase 3 ships.
