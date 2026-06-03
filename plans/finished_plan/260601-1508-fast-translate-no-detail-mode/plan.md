---
title: "Fast Translate Without Detail Mode"
description: "Remove translate modes and detailed AI translation. Keep one fast translate path, and use dictionary lookup/search for learner detail."
status: pending
priority: P1
branch: "feat/dictionary-mvp"
tags: [translation, dictionary, performance, api, study]
blockedBy: [260601-1013-translate-flow-performance]
blocks: []
created: "2026-06-01T08:08:29.813Z"
createdBy: "ck:plan"
source: skill
---

# Fast Translate Without Detail Mode

## Overview

The target translation flow has no `quick` or `detailed` mode. `/api/translate` returns one fast result from cache, dictionary, fallback, or non-AI machine translation. Extra learner context moves to dictionary lookup/search instead of detailed AI translation.

This plan intentionally follows the lower-level query optimization plan. Finish the hot-path performance cuts first, then simplify the product contract around the fast path.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Contract and UX Cleanup](./phase-01-contract-and-ux-cleanup.md) | Pending |
| 2 | [API Simplification](./phase-02-api-simplification.md) | Pending |
| 3 | [Dictionary Detail Replacement](./phase-03-dictionary-detail-replacement.md) | Pending |
| 4 | [Tests and Documentation](./phase-04-tests-and-documentation.md) | Pending |

## Dependencies

- Depends on `plans/260601-1013-translate-flow-performance` so the fast path remains budgeted before deleting legacy detailed mode.
- Builds on `plans/260531-dictionary-mvp-feature` for dictionary lookup/search UI and endpoints.

## Success Criteria

- `/api/translate` accepts no `mode` field and returns only the fast translation response shape.
- Detailed AI translation code path is removed from study translate.
- Opening detail from the popup uses dictionary lookup/search.
- Save vocabulary works from the fast translation result.
- Translation docs, route tests, UI tests, and performance benchmark reflect the fast-only contract.
