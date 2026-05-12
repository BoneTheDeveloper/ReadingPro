---
title: "Fix passage persistence and orphaned storage cleanup"
description: "GH-31: Uploaded passages disappear after reload because study page never fetches from DB. Also orphaned storage files on failed uploads."
status: pending
priority: P1
branch: "fix/31-passage-persistence-orphaned-cleanup"
tags: [bug, storage, data-persistence]
blockedBy: []
blocks: []
created: "2026-05-11T15:30:48.461Z"
createdBy: "ck:plan"
source: skill
---

# Fix passage persistence and orphaned storage cleanup

## Overview

Two bugs from GH-31:
1. **Passages vanish on reload** — `StudyPageClient` initializes with empty `useState([])` and never fetches from DB. `getUserPassages()` exists in `passage-queries.ts` but has zero callers.
2. **Orphaned storage files** — `upload/route.ts` stores file in Supabase Storage *before* validating word count. If validation fails, `deleteFile()` is never called.

## Root Cause

**Bug 1:** `study-page-client.tsx:28` — `initialState.passages = []`. No `useEffect` fetches persisted passages. The `handleUploadComplete` callback only appends to local state.

**Bug 2:** `upload/route.ts:56-78` — Storage upload happens at line ~56, word count validation at line ~78. Error return at line ~80 doesn't clean up the stored file.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Fetch passages on mount](./phase-01-fetch-passages-on-mount.md) | Pending |
| 2 | [Add storage cleanup on upload failure](./phase-02-add-storage-cleanup-on-upload-failure.md) | Pending |
| 3 | [Verify build](./phase-03-verify-build.md) | Pending |

## Dependencies

None.
