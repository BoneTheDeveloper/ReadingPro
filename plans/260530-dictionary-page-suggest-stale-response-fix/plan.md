---
title: "Dictionary Page Suggest Stale Response Fix"
description: ""
status: pending
priority: P2
branch: "feat/inline-translation-study-ui"
tags: []
blockedBy: []
blocks: []
created: "2026-05-30T07:42:29.213Z"
createdBy: "ck:plan"
source: skill
---

# Dictionary Page Suggest Stale Response Fix

## Overview

Fix the PR #55 Dictionary page suggest-search race condition separately from the Study quick-mode translation work. This plan is intentionally scoped to `/dictionary`: older suggest responses must not overwrite newer input results or repopulate suggestions after the input has been cleared.

## Scope

In scope:

- Guard `DictionaryPageClient` suggest fetches against stale responses.
- Clear suggestions and hide the dropdown when the search query is cleared.
- Add focused tests for out-of-order responses and cleared-input behavior.

Out of scope:

- No Study quick translation UX changes.
- No translation cache or dictionary resolver changes.
- No dictionary schema redesign.
- No seed dictionary changes.

## Acceptance Criteria

- A slower response for an older query cannot overwrite suggestions for the current query.
- Clearing the dictionary search input keeps suggestions empty and dropdown hidden even if an in-flight request resolves later.
- Loading state is cleared correctly for aborted or stale requests.
- Existing exact dictionary lookup and suggestion UI behavior remain unchanged for normal ordered requests.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Stale Suggest Guard](./phase-01-stale-suggest-guard.md) | Pending |
| 2 | [Regression Tests and Verification](./phase-02-regression-tests-and-verification.md) | Pending |

## Dependencies

This plan is split out from `plans/260530-pr55-inline-translation-review-fixes` because it affects the Dictionary page, not the Study quick-mode flow. It can be implemented after or independently from the quick-mode plan, but should not be mixed into that implementation batch.

## Review Source

- PR #55 Codex review thread: `src/features/dictionary/dictionary-page-client.tsx` stale dictionary suggestions.
