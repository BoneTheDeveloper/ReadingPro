---
title: "ENG-8 Sub-Issues: Wire Upload → Analysis → Test Flow End-to-End"
status: "in-progress"
created: "2026-05-02"
linearParent: "ENG-8"
blockedBy: []
blocks: []
---

# ENG-8 Sub-Issues Implementation Plan

## Overview

Finish all sub-issues under ENG-8 to make the study page flow work reliably end-to-end. 4 issues across 3 phases.

## Issue Summary

| ID | Title | Priority | Type |
|---|---|---|---|
| ENG-35 | Split upload and analysis | Urgent | Improvement |
| ENG-33 | AI question gen fails silently | High | Bug |
| ENG-34 | User not notified on AI failure | High | Bug |
| ENG-36 | Wire SM-2 quality rating | Medium | Improvement |

## Phases

### Phase 1: Split Upload and Analysis (ENG-35)
**File:** [phase-01-split-upload-analysis.md](phase-01-split-upload-analysis.md)
**Status:** pending | **Effort:** M | **Priority:** Urgent

Separate upload (file parsing) from analysis (AI pipeline). Upload endpoints return `{ text, title }` only. Client triggers `studyAnalyzeAction` directly. Remove duplicate `analyzeContentAction`.

**Why first:** Restructures architecture — bug fixes should apply to refactored code, not code about to be rewritten.

### Phase 2: Fix AI Pipeline Error Handling (ENG-33 + ENG-34)
**File:** [phase-02-fix-ai-error-handling.md](phase-02-fix-ai-error-handling.md)
**Status:** pending | **Effort:** M | **Priority:** High

Fix silent Gemini failures (ENG-33): add detailed error logging, investigate `generateObject()` schema issues, return errors instead of empty results. Add user-facing error notifications (ENG-34): error UI in both panels, retry option, partial failure warnings.

**Why combined:** Same code area (`studyAnalyzeAction`), same concern (error handling), different angles (server vs client).

### Phase 3: Wire SM-2 Quality Rating (ENG-36)
**File:** [phase-03-wire-sm2-rating.md](phase-03-wire-sm2-rating.md)
**Status:** pending | **Effort:** S | **Priority:** Medium

After each answer submission, map correctness to SM-2 quality rating (0-5), call card review API, update spaced repetition state.

**Why last:** Depends on ENG-33 fix — questions must generate correctly before rating them.

## Dependencies

```
Phase 1 (ENG-35) → Phase 2 (ENG-33 + ENG-34) → Phase 3 (ENG-36)
```

## Key Files

| File | Lines | Role |
|---|---|---|
| `src/app/actions/analyze.ts` | 260 | AI pipeline orchestrator |
| `src/app/api/upload/route.ts` | 105 | File upload endpoint |
| `src/app/api/upload/text/route.ts` | 47 | Text upload endpoint |
| `src/app/(dashboard)/study/study-page-client.tsx` | 76 | Parent state + callbacks |
| `src/app/(dashboard)/study/study-left-panel.tsx` | 218 | Upload + reading view |
| `src/app/(dashboard)/study/study-right-panel.tsx` | 339 | Questions + test flow |
| `src/lib/algorithms/sm2.ts` | 91 | SM-2 algorithm |
| `src/lib/db/utils.ts` | 223 | DB operations |
| `src/app/api/cards/review/route.ts` | 42 | Card review API |

## Risks

1. **Gemini API failures** — root cause unclear (schema mismatch? model compat? quota?). Phase 2 investigation needed.
2. **Upload refactor may break old `/upload` page** — need backward compat check.
3. **SM-2 card creation** — questions answered in study page may need initial `CardReview` record before updating.
