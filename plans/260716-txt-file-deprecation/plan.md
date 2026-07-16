# Plan: Deprecate .txt File Upload (Visual Fade)

## Summary
Fade the `.txt` file option in the upload zone to guide users toward paste input. Keep functionality for backward compatibility.

## Changes

| File | Change |
|------|--------|
| `src/features/upload/components/model/upload-zone.tsx` | Fade `.txt` in accepted types, add disabled styling + tooltip |
| `src/features/upload/lib/upload-validation.ts` | Remove `.txt` validation path (paste covers it) |

## Status
- [ ] Phase 1: Update upload zone UI (fade .txt, add tooltip)
- [ ] Phase 2: Remove .txt validation (optional, paste handles it)
