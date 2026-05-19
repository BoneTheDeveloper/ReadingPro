---
title: "English Reading Maintainability Refactor Layout"
description: "Refactor layout plan based on GKG MCP inspection of API routes, server actions, service modules, and large UI coordinators."
status: completed
priority: P2
branch: ""
tags: ["maintainability", "refactor", "layout", "gkg"]
blockedBy: []
blocks: []
created: "2026-05-19T00:00:00.000+07:00"
createdBy: "ck:cook"
source: skill
---

# English Reading Maintainability Refactor Layout

## Overview

GKG MCP inspection shows the codebase already has useful separation in `src/lib/db`, `src/lib/ai`, `src/lib/validation`, and feature-level server actions. The main maintainability risk is not global architecture; it is orchestration logic accumulating inside API routes, server actions, and a large client coordinator.

This plan does not implement code changes yet. It defines the refactor layout to keep UI components focused on interaction state, API routes focused on HTTP boundaries, and business workflows in reusable feature services.

## GKG Findings

| Area | Finding | Risk | Refactor Direction |
|------|---------|------|--------------------|
| `src/app/api/upload/route.ts` | `POST` handles auth, multipart parsing, file validation, storage upload, PDF/text extraction, word-count validation, title sanitation, content analysis, response shaping, and cleanup. | High: too many responsibilities in one HTTP handler; cleanup flag currently never flips from `false`, so catch-path cleanup is ineffective. | Move upload processing into a dedicated upload workflow service. Keep route responsible for request parsing and HTTP response mapping. |
| `src/features/upload/analyze-content-action.ts` | `analyzeContentAction` performs CEFR detection, target-level selection, AI simplification, question generation, auth lookup, DB passage creation, question mapping, and instrumentation. | High: this is business orchestration hidden inside a server action and reused by API routes through `FormData`. | Extract content analysis and persistence into a typed service API. Keep server action as adapter only. |
| `src/features/study/actions/study-simplify-action.ts` and `study-generate-questions-action.ts` | Both actions repeat passage ownership lookup, AI orchestration, validation, DB mutation, and response mapping. | Medium-high: duplicated ownership and AI workflow patterns will drift. | Introduce study passage service functions: `simplifyPassageForUser`, `generateQuestionsForPassage`, and shared mappers. |
| `src/app/api/study-session/route.ts` | Route reimplements session create/update logic that already exists in `src/lib/db/study-session-queries.ts`. | Medium: route and DB helper behavior can diverge; validation and ownership are duplicated. | Route should delegate to `createStudySession` and `updateStudySession`, then map known validation errors to HTTP responses. |
| `src/app/api/study-chat/route.ts` | Route validates input, fetches passage, builds prompt context, configures model, and streams. | Medium: acceptable for now, but prompt/context assembly is business logic that will grow. | Extract prompt/context assembly into `src/features/study-chat` or `src/lib/ai/study-chat` if chat behavior expands. |
| `src/features/study/study-page-client.tsx` | Large client coordinator manages panel layout, upload state, passage selection, simplification, question generation, result history, deletion, and UI composition. | Medium-high: hard to test, and async UI state transitions are duplicated between simplify entry points. | Split into hooks/reducer: `useStudyWorkspaceState`, `useStudyPanelLayout`, and `useStudyActions`. |
| `src/lib/shared/cefr-utils.ts` | Mixes domain CEFR detection with UI Tailwind class mapping. | Medium: server/action code imports a file that also contains presentation concerns. | Split CEFR domain helpers from CEFR UI presentation helpers. |
| `src/lib/db/card-review-queries.ts` | Contains `calculateSM2Interval` even though `src/lib/algorithms/sm2.ts` already owns SM2 logic. | Medium: duplicate algorithm paths can drift and make spaced repetition behavior inconsistent. | Make DB card-review queries call the canonical SM2 algorithm module. |
| `src/lib/db/card-review-queries.ts` | Re-exports CEFR UI helpers from a DB query module. | Medium: database module becomes a convenience barrel for unrelated UI/domain concerns. | Remove the re-export and import CEFR helpers directly from their proper modules. |
| `src/lib/shared/reading-utils.ts` | Contains presentation formatting (`~N min read`) and reading-domain analysis in one file. | Low-medium: acceptable now, but it will blur if reading analysis grows. | Optionally split formatting into UI helpers and keep text analysis in domain helpers. |
| `src/lib/validation/upload.ts` | Upload validation is used by both client components and server routes. | Low: placement is reasonable, but server must remain authoritative. | Keep shared validation, but route/service code should always revalidate. |
| Thin API routes | `cards/due`, `progress/stats`, and most card review logic already delegate to lib/db functions. | Low: these are close to desired shape. | Leave mostly unchanged; optionally standardize error mapping later. |

## Target Layout

```text
src/features/upload/
  upload-page-client.tsx
  upload-zone.tsx
  text-input-area.tsx
  upload-workflow.ts          # new: file/text upload orchestration
  content-analysis-service.ts # new: CEFR + simplification + question generation + persistence
  analyze-content-action.ts   # adapter only

src/features/study/
  study-page-client.tsx       # composition only
  use-study-workspace-state.ts
  use-study-panel-layout.ts
  use-study-actions.ts
  actions/
    *.ts                      # server action adapters only
  services/
    passage-study-service.ts  # simplify/generate/delete workflows

src/features/study-chat/
  study-chat-service.ts       # optional if route keeps growing

src/lib/
  domain/
    cefr.ts                   # new or renamed: CEFR type, labels, heuristics, target-level map
    reading.ts                # optional: reading text analysis
  ui/
    cefr-style.ts             # optional: CEFR badge/color class mapping
  algorithms/
    sm2.ts                    # canonical spaced repetition implementation

src/app/api/
  */route.ts                  # auth/request parsing/HTTP response mapping only
```

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Lib Boundary Cleanup | Completed |
| 2 | Content Upload Workflow Service | Completed |
| 3 | Study Action Service Extraction | Completed |
| 4 | Study Client State/Layout Split | Completed |
| 5 | API Route Thinning and Error Mapping | Completed |
| 6 | Verification and Documentation | Completed |

## Phase Details

### Phase 1: Lib Boundary Cleanup

- Split CEFR domain helpers from CEFR UI styling helpers.
- Remove CEFR helper re-exports from `src/lib/db/card-review-queries.ts`.
- Replace `calculateSM2Interval` with the canonical `src/lib/algorithms/sm2.ts` implementation or merge both paths into one exported algorithm.
- Keep `src/lib/validation/upload.ts` shared, but verify server routes/services remain authoritative for validation.
- Defer splitting `reading-utils.ts` unless the refactor touches those callers.

### Phase 2: Content Upload Workflow Service

- Create typed request/result models for text upload and file upload.
- Move file storage, PDF/text extraction, word-count validation, cleanup, and `analyzeContentAction` replacement flow out of `src/app/api/upload/route.ts`.
- Replace `FormData` coupling between routes/actions and content analysis with a typed service function.
- Fix storage cleanup ownership by tracking successful storage upload in the workflow result or scoped cleanup handler.

### Phase 3: Study Action Service Extraction

- Extract shared passage ownership lookup and deleted-passage filtering.
- Extract `simplifyPassageForUser` from `studySimplifyAction`.
- Extract `generateQuestionsForPassage` from `studyGenerateQuestionsAction`.
- Centralize generated-question validation and persistence mapping.
- Keep server actions as thin adapters around auth, instrumentation, service call, and return-shape mapping.

### Phase 4: Study Client State/Layout Split

- Move three-panel collapse/expand logic from `study-page-client.tsx` into `useStudyPanelLayout`.
- Move passage/result state transitions into a reducer or `useStudyWorkspaceState`.
- Move async action handlers into `useStudyActions`, with stale-passage guards and result status updates in one place.
- Keep `StudyPageClient` responsible for composing panels and modal props.

### Phase 5: API Route Thinning and Error Mapping

- Update `src/app/api/study-session/route.ts` to call existing `createStudySession` and `updateStudySession`.
- Standardize route error mapping for validation/auth/not-found cases.
- Keep `cards/due`, `cards/review`, and `progress/stats` mostly unchanged unless shared error helpers reduce meaningful duplication.
- Revisit `study-chat` only if prompt construction needs reuse or grows beyond current scope.

### Phase 6: Verification and Documentation

- Add focused tests around extracted services where practical.
- Run `pnpm lint`, `pnpm exec tsc --noEmit`, and relevant route/action tests if available.
- Update `docs/codebase-summary.md` or architecture docs if the service layout materially changes.

## Success Criteria

- API route handlers contain only request parsing, auth boundary, service invocation, and HTTP response mapping.
- Server actions contain only server-action instrumentation, auth boundary, service invocation, and client-facing result mapping.
- Upload/content analysis no longer passes business data through `FormData` internally.
- CEFR domain logic and UI styling are no longer mixed in one shared module.
- Spaced repetition uses one canonical SM2 implementation.
- Study AI workflows share ownership lookup, generated-question mapping, and persistence logic.
- `StudyPageClient` is materially smaller and no longer owns both layout mechanics and async workflow state.
- Existing upload, study, reading, test, and progress flows behave the same after refactor.

## Review Gate

Implementation completed on 2026-05-19.

Verification:

- `pnpm exec tsc --noEmit`
- `pnpm lint`
