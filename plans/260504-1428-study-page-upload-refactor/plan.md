---
title: "Study Page Upload & Pipeline Refactor"
description: "Refactor study page to move upload into left panel via modal, split analysis pipeline into 3 independent server actions, add on-demand simplify + question generation"
status: pending
priority: P1
effort: 6h
branch: main
tags: [study-page, pipeline, refactor, upload-modal]
created: 2026-05-04
---

## Overview

Split monolithic `studyAnalyzeAction` (CEFR + simplify + questions + DB save in one call) into 3 independent server actions. Move upload UI from center panel to left panel modal. Add on-demand Simplify button and Generate Questions button.

## Phases

| # | Phase | Status | File Ownership |
|---|-------|--------|----------------|
| 1 | [Split server actions](./phase-01-split-server-actions.md) | pending | `src/app/actions/analyze.ts` |
| 2 | [Update types](./phase-02-update-types.md) | pending | `src/app/(dashboard)/study/study-types.ts` |
| 3 | [Upload modal component](./phase-03-upload-modal.md) | pending | `src/app/(dashboard)/study/study-upload-modal.tsx` (new) |
| 4 | [Refactor left panel](./phase-04-left-panel.md) | pending | `src/app/(dashboard)/study/study-left-panel.tsx` |
| 5 | [Refactor content panel](./phase-05-content-panel.md) | pending | `src/app/(dashboard)/study/study-content-panel.tsx` |
| 6 | [Refactor right panel](./phase-06-right-panel.md) | pending | `src/app/(dashboard)/study/study-right-panel.tsx` |
| 7 | [Rewire client orchestrator](./phase-07-client-rewire.md) | pending | `src/app/(dashboard)/study/study-page-client.tsx` |

## Dependencies

```
Phase 1 (server actions) ──► Phase 2 (types)
Phase 2 ──► Phase 3 (modal) ──► Phase 4 (left panel)
Phase 2 ──► Phase 5 (content panel)
Phase 2 ──► Phase 6 (right panel)
Phase 4 + 5 + 6 ──► Phase 7 (client rewire)
```

Phases 3, 4, 5, 6 can proceed once Phase 2 is done. Phase 7 is the integration phase.

## Key Data Flows

### Upload Flow
```
User clicks "Add New" → Modal opens → User provides text/file
→ studyUploadAction(text, title) → CEFR detect → DB save → return passage
→ Card appears in left panel with shimmer → ready with title + CEFR badge
```

### On-Demand Simplify Flow
```
User clicks "Simplify" button → studySimplifyAction(passageId)
→ Fetch passage from DB → Simplify → Update DB → return simplified data
→ Content panel updates, view toggle appears
```

### On-Demand Generate Questions Flow
```
User clicks "Generate Questions" → studyGenerateQuestionsAction(passageId)
→ Fetch passage from DB → Generate questions → Save to DB → return questions
→ Questions appear in Q&A tab
```

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Question regeneration | Warn before replacing | User may have quiz progress to lose |
| A1/A2 simplify UX | Hide button entirely | Simplest, no confusion |
| Simplify after questions | Keep existing questions | No auto-regen, user controls question gen |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Race condition: double-click simplify | Medium | Medium | Disable button during processing, use `simplifying` boolean state |
| AI call fails on simplify/questions | Medium | Low | Graceful degradation, show error toast, passage still readable |
| Modal z-index conflicts with sidebar | Low | Low | Use fixed overlay with high z-index, test with sidebar open |
| Existing analyzeContentAction breaks | Low | High | Keep old action untouched, add new actions alongside |

## Rollback Plan

Each phase touches distinct files. Rollback = revert specific files to pre-phase state. Phase 7 (client rewire) is the integration point -- if it fails, revert only `study-page-client.tsx` and the page reverts to old behavior.

## Success Criteria

- [ ] Upload via left panel modal creates passage + shows card in sources list
- [ ] Click source card loads content in center panel
- [ ] Simplify button triggers on-demand simplification, view toggle appears
- [ ] Generate Questions button creates questions, visible in Q&A tab
- [ ] No upload UI remains in center panel
- [ ] Empty state shown when no passage selected
- [ ] Loading states (shimmer on card, spinner on buttons) work correctly
- [ ] All files under 200 lines
- [ ] Existing `analyzeContentAction` still works (backward compat)
