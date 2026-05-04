---
title: "Study Page Upload & Pipeline Refactor — Implementation Plan"
description: "7-phase plan to split monolithic analyze pipeline into 3 server actions and refactor study page UX"
status: completed
priority: P1
created: 2026-05-04
---

## Summary

Created 7-phase implementation plan for refactoring the study page upload and analysis pipeline.

**Plan location:** `plans/260504-1428-study-page-upload-refactor/`

## Architecture Decision

Split monolithic `studyAnalyzeAction` (CEFR + simplify + questions + DB in one call) into 3 independent server actions triggered on-demand by UI interactions. This decouples the pipeline stages, enabling:

- Faster perceived upload (CEFR detect only, ~3s vs ~15s full pipeline)
- On-demand simplify and question generation (user controls when)
- Simpler error recovery (retry one step, not the whole pipeline)

## Phase Breakdown

| Phase | File(s) | Effort | Key Work |
|-------|---------|--------|----------|
| 1 | `actions/analyze.ts` (or split files) | 2h | 3 new server actions + shared helper |
| 2 | `study-types.ts` | 0.5h | New state fields + modal props |
| 3 | `study-upload-modal.tsx` (new) | 1h | Upload modal reusing UploadZone + TextInputArea |
| 4 | `study-left-panel.tsx` | 1h | Modal trigger + shimmer card |
| 5 | `study-content-panel.tsx` | 1.5h | Remove upload UI, add empty state + simplify button |
| 6 | `study-right-panel.tsx` | 1h | Real Generate button + loading state (may need QuizContent extraction) |
| 7 | `study-page-client.tsx` | 1.5h | Integration: new handlers, state, prop wiring |

**Total: ~9h** (overlap possible in phases 4-6 since files are independent)

## Dependency Graph

```
Phase 1 (actions) --> Phase 2 (types)
Phase 2 --> Phase 3 (modal)
Phase 2 --> Phase 4 (left panel)  ─┐
Phase 2 --> Phase 5 (content)     ─┤── parallel possible
Phase 2 --> Phase 6 (right panel) ─┘
Phase 4+5+6 --> Phase 7 (integration)
```

## Key Risks

1. **File size:** `analyze.ts` is already 284 lines. Adding 3 actions likely exceeds 200-line limit. Mitigation: split into separate action files.
2. **Right panel size:** `study-right-panel.tsx` is 438 lines (QuizContent alone is ~340 lines). Mitigation: extract QuizContent into `study-quiz-content.tsx`.
3. **Client orchestrator:** Adding 4 new handlers to `study-page-client.tsx` (currently 115 lines) pushes it close to 200. Mitigation: extract into `use-study-actions` custom hook.

## File Ownership (No Parallel Conflicts)

| Phase | Sole file modified |
|-------|-------------------|
| 1 | `src/app/actions/analyze.ts` (or new action files) |
| 2 | `src/app/(dashboard)/study/study-types.ts` |
| 3 | `src/app/(dashboard)/study/study-upload-modal.tsx` (new) |
| 4 | `src/app/(dashboard)/study/study-left-panel.tsx` |
| 5 | `src/app/(dashboard)/study/study-content-panel.tsx` |
| 6 | `src/app/(dashboard)/study/study-right-panel.tsx` + possible new `study-quiz-content.tsx` |
| 7 | `src/app/(dashboard)/study/study-page-client.tsx` |

## Rollback Strategy

Each phase touches distinct files. Revert by file. Phase 7 is the only coupling point -- reverting `study-page-client.tsx` alone restores old behavior since old `studyAnalyzeAction` is kept untouched.

## Unresolved Questions

1. **Question regeneration strategy:** When user clicks "Generate Questions" again, should existing questions be deleted and replaced, or should we append? Current plan: delete + replace (simpler). Alternative: warn user that existing quiz progress will be lost.
2. **A1/A2 simplify UX:** The design says simplify is "on-demand" but A1/A2 texts skip simplification. Should the Simplify button be hidden, disabled with tooltip, or show a message? Current plan: hide for A1/A2.
3. **Questions keyed to passage or to specific content version?** If user simplifies text after generating questions, should questions regenerate automatically? Current plan: questions generate against `simplifiedContent || content`, no auto-regen on simplify.
