# Plan: Refactor Translation to React Query + Fix studio/queries.ts

## Status: COMPLETE ✓

## Changes Made

### 1. Fixed `studio/queries.ts` — added AbortSignal handling
- Added `signal?: AbortSignal` to `fetchArtifactList` and `fetchArtifact`
- Updated hooks to pass signal: `({ signal }) => fetchArtifact(passageId!, signal)`

### 2. Created `reading/mutations.ts` — React Query mutation pattern
- Wrapped `useMutation` with clean API matching original hook
- Exposes `data`, `error`, `isPending`, `translate(word, context)`, `reset()`

### 3. Updated `content-panel.tsx`
- Uses `useTranslation()` from mutations.ts
- Simplified state management (no manual state tracking)

### 4. Updated `inline-translation-popup.tsx`
- Props unchanged — still receives `data`, `error`, `isPending`, `onTranslate`

### 5. Deleted `use-word-translation.ts`

## Files Changed

| File | Change |
|------|--------|
| `src/features/studio/queries.ts` | Added `signal` param |
| `src/features/reading/mutations.ts` | Created |
| `src/features/reading/component/content-panel.tsx` | Use new hook |
| `src/features/reading/component/inline-translation-popup.tsx` | Simplified |
| `src/features/reading/hook/use-word-translation.ts` | Deleted |

## Verification

- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] Old hook deleted
- [x] studio/queries.ts consistent with passage/queries.ts pattern
