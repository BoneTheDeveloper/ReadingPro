---
title: "StudyWorkspace Panel State Refactor"
description: "Decouple StudyWorkspace into narrow hooks per panel. Hooks split by data/mutation. Passage service wired for RSC + upload. No retry for failed artifacts."
status: pending
priority: P2
branch: "preview"
tags: ["refactor", "react", "state-management", "upload-flow"]
blockedBy: []
blocks: []
created: "2026-07-21T14:27:06.769Z"
createdBy: "ck:plan"
source: skill
---

# StudyWorkspace Panel State Refactor

## Overview

Refactor `StudyWorkspace` from a big orchestrator into a pure wire layer. Each panel gets a co-located hook that owns its logic. Hooks split by data/mutation type. Passage service wired into RSC and upload flow.

**Design doc:** `plans/brainstorm-reports/260721-study-workspace-panel-state-design.md`

## Key Decisions

| # | Decision |
|---|---|
| 1 | Upload: client creates passage → uploads file → Inngest updates/deletes |
| 2 | Failed artifacts: never stored in DB. No retry. Failed card removed from UI. |
| 3 | Failed passages: deleted from DB on Inngest failure |
| 4 | RSC page calls `listUserPassages(userId)` from passage service |
| 5 | `StudyState` type removed entirely after hook split |
| 6 | Hooks split by data type: `use*Query` for fetch, `use*Mutation` for writes |
| 7 | `viewingArtifact` owned in `useStudioArtifactQuery` |
| 8 | `chatOpen`/`chatPrefill` owned locally in StudioPanel |

## Ownership Contract

| Concern | Owner |
|---|---|
| `passages`, `activePassageId`, `status`, `error` | `useStudyWorkspaceState` |
| Upload modal open/close | `useStudyWorkspaceState` |
| `viewMode`, `selection`, quick translate, vocab save | `useContentState` |
| Artifacts list + fetch | `useStudioArtifactQuery` |
| Quiz mutations (generate, record/reset result) | `useQuizMutation` |
| `viewingArtifact` state | `useStudioArtifactQuery` |
| `chatOpen`, `chatPrefill` | StudioPanel (local) |
| Panel resize/collapse | `useStudyPanelLayout` |

## Data Flow

### First Access (RSC)
```
page.tsx (RSC)
  → listUserPassages(userId) from passage service
  → <StudyWorkspace initialPassages={...} />
```

### Upload Flow
```
1. Client creates passage { status: "processing" } in DB via passage service
2. File uploads to blob storage
3. If blob fails → client deletes passage from DB
4. Inngest fires:
   - Success → update passage { status: "ready", content, wordCount, cefrLevel }
   - Fail → delete passage from DB + delete blob via deleteFile(blobPath)
5. Client polls getUploadStatus(jobId):
   - DONE → replace temp with real passage
   - FAILED → remove from state
```

### Artifact Flow
```
1. useStudioArtifactQuery fetches artifacts from server
2. StudioPanel renders artifact list
3. Click → useQuizMutation.handleActionClick → optimistic card { status: "generating" }
4. Server: on fail → no DB record. On success → atomic commit.
5. Client: on fail → show error. No retry. Card stays in UI until page reload.
```

## Hook Naming

```
src/app/[locale]/(dashboard)/study/_hooks/
├── use-study-workspace-state.ts     ← passage CRUD + upload modal + activePassageId
└── use-study-panel-layout.ts       ← panel resize/collapse

src/features/reading/hooks/
└── use-content-state.ts            ← viewMode + translation + vocab save

src/features/studio-panel/hooks/
├── use-studio-artifact-query.ts     ← data fetch: getStudioArtifactsAction
├── use-quiz-mutation.ts            ← mutation: generateQuiz, record/reset result
└── (chatOpen/chatPrefill → StudioPanel local)
```

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Fix broken import](./phase-01-fix-broken-import.md) | Pending |
| 2 | [Wire passage service in RSC](./phase-02-rsc-passage-service.md) | Pending |
| 3 | [Refactor upload flow](./phase-03-refactor-upload-flow.md) | Pending |
| 4 | [Create useContentState hook](./phase-04-create-usecontentstate-hook.md) | Pending |
| 5 | [Create studio hooks: useStudioArtifactQuery + useQuizMutation](./phase-05-create-studio-hooks.md) | Pending |
| 6 | [Simplify StudioPanel props](./phase-06-simplify-studiopanel-props.md) | Pending |
| 7 | [Simplify StudyWorkspace wiring](./phase-07-simplify-studyworkspace-wiring.md) | Pending |

## Success Criteria

- [ ] Zero TypeScript errors after all 7 phases
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm knip` passes
- [ ] Upload flow works end-to-end
- [ ] Translation popup works in ContentPanel
- [ ] Studio artifacts load and open correctly
- [ ] Failed artifacts show error, no retry button
- [ ] Chat overlay opens/closes in StudioPanel
- [ ] Panel collapse/expand preserves state
- [ ] RSC uses `listUserPassages` from passage service
