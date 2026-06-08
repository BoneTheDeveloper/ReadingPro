---
title: "Study Workspace Usable Default State"
description: ""
status: pending
priority: P1
branch: "feature/63-stabilize-study-workspace-entry-source-selection"
tags: [study, workspace, p1, ux]
blockedBy: []
blocks: []
created: "2026-06-08T04:30:15.863Z"
createdBy: "ck:plan"
source: skill
---

# Study Workspace Usable Default State

## Overview

Make `/study` open directly into a useful learner workspace by selecting the newest saved passage by default, keeping the selected passage predictable after source mutations, and removing visible controls that do not yet perform real learner-loop work.

This is a small P1 stabilization pass. It should preserve the existing locale route, authenticated server load, three-panel resizable layout, quick selection translation flow, and upload modal.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Workspace State Contract](./phase-01-workspace-state-contract.md) | Pending |
| 2 | [Panel UX Cleanup](./phase-02-panel-ux-cleanup.md) | Pending |
| 3 | [Regression Tests And Verification](./phase-03-regression-tests-and-verification.md) | Pending |

## Dependencies

No unfinished project-local plan currently overlaps this scope.

## Scope

In scope:
- Auto-select the passage with the newest `createdAt` when `/study` receives saved passages.
- Keep active passage state stable after upload, delete, and source search.
- Make the no-passage content area point clearly to the existing add-source workflow.
- Remove or disable source/content controls that do not trigger implemented behavior.
- Preserve three-panel layout and `[locale]` routing.

Out of scope:
- New source providers, web search implementation, batch selection behavior, rename behavior, bookmark/share behavior, audio/listen behavior, or a new persistence model.
- Reworking the resizable panel system or moving the upload modal.

## Current Findings

- `src/app/[locale]/(dashboard)/study/page.tsx` fetches authenticated passages and passes them to `StudyPageClient`; it does not need route changes unless the query mapper gains fields.
- `src/features/study/use-study-workspace-state.ts` currently initializes `activePassageId` to `null`, so saved passages still render the empty content panel.
- Upload already selects the newly uploaded passage. Delete currently clears active state to `null` when deleting the selected passage, even when other passages remain.
- Source search in `src/features/study/study-left-panel.tsx` is local filtering and should not mutate active state.
- The left panel has unimplemented selection checkboxes/select-all. Rename is disabled but still visible. The content footer has buttons for full-passage translation, bookmark, and share without implemented handlers.

## Target Behavior

1. With saved passages: `/study` opens with the newest passage active and content visible.
2. With no saved passages: left panel and content panel both guide the learner to add a source; the content panel should expose the existing upload modal CTA.
3. After upload: the new passage remains active.
4. After deleting a non-active passage: active passage, questions, and status remain unchanged except for clearing any delete error on success.
5. After deleting the active passage:
   - Select the newest remaining passage if one exists.
   - Clear stale questions if the active passage changed.
   - Set status to `ready` if a replacement exists, otherwise `idle`.
6. Source search filtering must never clear or replace `activePassageId`.
7. Unimplemented controls should not look actionable in the core workspace.

## Related Code Files

- Modify: `src/features/study/use-study-workspace-state.ts`
- Modify: `src/features/study/study-left-panel.tsx`
- Modify: `src/features/study/study-content-panel.tsx`
- Modify: `src/features/study/study-page-client.tsx`
- Modify: `src/features/study/use-study-workspace-state.test.ts`
- Modify: `localization/messages/en.json`
- Modify: `localization/messages/vi.json`

## Verification Gates

- `pnpm exec vitest run src/features/study/use-study-workspace-state.test.ts`
- `pnpm run lint`
- Manual smoke: open `/en/study` or `/vi/study` with saved passages and with an empty account/test state.
