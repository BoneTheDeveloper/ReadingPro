---
title: "Issue 67: Inline Translation Contract and Vocabulary Save Flow"
description: "Fix silent save errors, double-save, and missing save button in the translation popup"
status: pending
priority: P1
branch: "feature/issue-67-translation-contract"
tags: [translation, vocabulary, study, ux, p1]
blockedBy: []
blocks: []
created: "2026-06-18T13:20:01.688Z"
createdBy: "ck:plan"
source: skill
---

# Issue 67: Inline Translation Contract and Vocabulary Save Flow

## Overview

Three concrete bugs in the Study inline translation flow:

1. **Save error is silent** — `handleSaveVocabulary` catches into Sentry only; user sees nothing.
2. **Double-save is possible** — no in-flight guard; rapid clicks send multiple POSTs.
3. **Save button not in the popup** — after translation succeeds the user must click "Open Details" to save (2-click friction). Save should live in the popup itself.

**Telemetry is already clean** — both routes log only metadata, never raw text (confirmed by research).
**Client payload already matches the route schema** — schema move is out of scope.

## Research Reports

- `plans/reports/researcher-vocab-save-detection.md`
- `plans/reports/researcher-translate-ux.md`

## Phases

| Phase | Name | Status | Effort |
|-------|------|--------|--------|
| 1 | [Vocabulary Save Foundation](./phase-01-vocabulary-save-foundation.md) | Pending | 2h |
| 2 | [Save Button in Popup](./phase-02-save-button-in-popup.md) | Pending | 2h |
| 3 | [Tests](./phase-03-tests.md) | Pending | 2h |

## Key Files

| File | Role |
|------|------|
| `src/features/study/study-page-client.tsx` | State machine: translate + vocab save |
| `src/features/study/study-translation-popup.tsx` | Popup UI — save button goes here |
| `src/features/study/study-translate-panel.tsx` | Sidebar panel (keep consistent) |
| `src/features/study/study-types.ts` | Add `VocabularySaveStatus` type |
| `src/app/api/vocabulary/route.ts` | POST handler — add `isNew` flag to response |
| `src/lib/translation/shared/translation-response-schema.ts` | Add `isNew: boolean` to vocab response schema |
| `src/server/db/vocabulary-queries.ts` | `upsertVocabularyItem` — detect new vs existing |

## Out of Scope

- Moving `translateRequestSchema` to a shared contracts location (later task)
- Extracting inline fetches into an `api-client` module (later task)
- Translate error display changes (already works — red text shown in popup)
- Advanced SM-2 / retention path (issue #70)

## Dependencies

None. This is the first issue in the `#67 → #65 → #81 → #70 → #71` chain.
