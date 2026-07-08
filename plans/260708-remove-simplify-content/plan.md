---
name: remove-simplify-content
description: Strip simplification from upload pipeline, rename Original/Simplified toggle to Source/Passage in content panel
status: pending
created: 2026-07-08
---

## Overview

Remove all simplification-related code from the upload pipeline and replace the content panel's Original/Simplified toggle with Source/Passage (placeholder for future PDF/YouTube rendering).

## Changes

| File | Change |
|------|--------|
| `src/features/upload/services/content-analysis.service.ts` | Remove `simplifyContent()` call, remove `simplifiedLevel`, stop passing to DB |
| `src/features/upload/db/content-analysis/content-analysis.repository.ts` | Stop writing `simplifiedContent`/`simplifiedLevel` |
| `src/features/upload/db/upload-workflow.ts` | Remove `simplifiedLevel` from result type, stop passing |
| `src/features/upload/actions.ts` | Remove `simplifiedLevel` from response (nullable, backward compat — keep) |
| `src/features/upload/schemas/upload.schema.ts` | Keep `simplifiedLevel` (nullable, backward compat) |
| `src/features/reading/ui/content-panel.tsx` | Rename `viewMode: "simplified"` → `"passage"`, toggle labels `Original` → `Source`, `Simplified` → `Passage`, CEFR badge logic |
| `src/app/[locale]/(dashboard)/study/_hooks/use-study-workspace-state.ts` | Remove `simplifying` field from state + all reducers |
| `src/features/passage/services/passage-study.service.ts` | Use `passage.content` directly (remove fallback to `simplifiedContent` since it's always null now) |
| `src/services/ai/content-simplifier.ts` | **DELETE** |
| `prisma/models/passage.prisma` | Keep `simplifiedContent`/`simplifiedLevel` fields (nullable, harmless) |

## No Change (keep nullable fields for backward compat)

- `PassageData` in `passage.schema.ts` — keep `simplifiedContent`/`simplifiedLevel` (nullable)
- `upload.schema.ts` — keep `simplifiedLevel` in schema (nullable)
- `actions.ts` — `simplifiedLevel` stays in response (null always now)

## Success Criteria

- [ ] Upload still works end-to-end (file + text)
- [ ] Quiz generation still works (uses `passage.content`)
- [ ] Toggle shows "Source" / "Passage" instead of "Original" / "Simplified"
- [ ] No `simplifyContent()` call anywhere in the upload flow
- [ ] No `simplifying` field in workspace state
- [ ] `content-simplifier.ts` deleted
- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run lint` passes
