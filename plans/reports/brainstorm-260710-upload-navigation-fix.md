---
name: brainstorm-260710-upload-navigation-fix
description: Avoid router.push after upload - use callback + router.refresh() instead
metadata:
  type: user
---

# Brainstorm Summary: Fix Upload Navigation

## Problem

After upload completes, `use-upload-submit.ts` calls `router.push(/study?passageId=xxx)` causing:
- Full page re-mount (RSC re-fetches all passages)
- Potential three-panel state reset
- Dead code: `handleUploadComplete` in `use-study-workspace-state.ts` never called

## Solution: Option C (Hybrid)

Replace `router.push` with callback pattern:

```
UploadModal → use-upload-submit → onUploadComplete(passageId) →
  → StudyWorkspace → setState(activePassageId) + router.refresh()
```

## Changes

| File | Change |
|------|--------|
| `use-upload-submit.ts` | Return `{ passageId }` instead of `router.push()` |
| `upload-modal.tsx` | Call `onUploadComplete?.(passageId)` after upload |
| `use-study-workspace-state.ts` | Accept `passageId: string` instead of `passage: PassageData` |

## Key Insights from Scout

1. **cefrLevel hardcoded**: `pollJobStatus` returns hardcoded `"B2"` — not from server
2. **SessionStorage survives navigation**: `react-resizable-panels` uses sessionStorage, so panel sizes persist
3. **Scroll state in memory only**: `useScrollProgress` uses React state — will reset
4. **Dead code found**: `handleUploadComplete` already implemented but never called

## Files to Modify

- `src/features/upload/hooks/use-upload-submit.ts`
- `src/features/upload/ui/upload-modal.tsx`
- `src/app/[locale]/(dashboard)/study/_hooks/use-study-workspace-state.ts`

## Files to Create/Update

- Update doc: `docs/Data-flow/passage-render-after-upload.md`
