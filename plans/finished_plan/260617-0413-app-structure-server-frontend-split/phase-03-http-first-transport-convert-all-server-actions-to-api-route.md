---
phase: 3
title: HTTP-first transport (convert all server actions to API routes)
status: completed
priority: P2
effort: 1.5d
dependencies:
  - 2
---

# Phase 3: HTTP-first transport (convert all server actions to API routes)

## Overview
Replace every `'use server'` action with an `app/api` route handler plus a typed `features/<d>/api/` fetch caller. Establishes one consistent client→backend pattern that a future mobile/2nd client can call. Behavior preserved; only the transport changes.

## Requirements
- Functional: each current action's behavior is reachable via an HTTP route; UI consumers call it through a `features/api` wrapper; auth + validation + error contract unchanged.
- Non-functional: no remaining `'use server'` files; request/response validated against `src/shared/<domain>` schemas.

## Architecture
All current actions are thin mutations (`getAuthenticatedUser()` → call backend). Each becomes: `route.ts` (validate with shared schema → call `server/modules/...` → shaped JSON) + `features/<d>/api/<name>-client.ts` (typed fetch). Follow the existing thin-adapter pattern in `src/app/api/study-session/route.ts` and the existing `features/study/api/*-client.ts`.

**Action → route map** (route naming: nest under `/api/study/*`, validated). NOTE: `studyUploadAction` calls `createPassageRecord` (simple create) — this is a DIFFERENT operation from the existing `POST /api/upload/text`, which runs `analyzeAndPersistContent` (heavier AI-analysis flow). Do NOT reuse `upload/text`; `studyUpload` gets its own route.

| Action | Consumer (rewire to api caller) | Target route + method |
|---|---|---|
| `studyUploadAction` | `features/study/ui/upload-modal.tsx` | new `POST /api/study/passages` (→ `createPassageRecord`) |
| `studySimplifyAction` | `features/study/hooks/use-study-actions.ts` | new `POST /api/study/passages/[id]/simplify` |
| `studyDeletePassageAction` | `features/study/hooks/use-study-workspace-state.ts` | new `DELETE /api/study/passages/[id]` |
| `studioLoadArtifactDetailAction` | `features/study/hooks/use-study-actions.ts` | extend existing `/api/studio-artifacts` family → add `GET /api/studio-artifacts/[id]` |
| `studioRecordQuizResultAction` | `features/study/ui/studio/quiz/quiz-results.tsx` | new `POST /api/studio-artifacts/[id]/quiz-result` |
| `studioResetQuizResultAction` | `features/study/ui/studio/studio-panel.tsx`, `quiz-results.tsx` | new `DELETE /api/studio-artifacts/[id]/quiz-result` |
| `analyzeContentAction` | none (confirmed dead code) | **DELETE** — not converted |

**Routing note (flagged for review):** passage mutations nest under `/api/study/passages/*` per the validated naming choice. Artifact/quiz operations extend the EXISTING top-level `/api/studio-artifacts` family rather than creating a parallel `/api/study/artifacts`, to avoid two artifact route families (DRY). This leaves `studio-artifacts` / `studio-questions` at top level while new passage routes sit under `/api/study/` — a known minor inconsistency. Optional future cleanup (out of scope): unify all studio/study routes under `/api/study/*`.

## Related Code Files
- Create: route handlers under `src/app/api/...` per map; `features/study/api/*-client.ts` (and `features/upload/api/` if `analyzeContentAction` is live).
- Modify: the consumer files above (swap action import for api caller); request/response schemas in `src/shared/study/` (add any missing).
- Delete: `src/features/study/actions/*` and `src/features/upload/actions/analyze-content-action.ts` once consumers are rewired; `study-shared.ts` if unused after.

## Implementation Steps
1. First: delete `analyzeContentAction` + its file `src/features/upload/actions/analyze-content-action.ts` (confirmed unreferenced); remove the now-empty `upload/actions/` dir if nothing remains.
2. For each remaining action, in order: define/confirm shared request+response schema → add route handler at its `/api/study/*` (or `/api/studio-artifacts/*`) path per the map (validate, auth via `getAuthenticatedUser`, delegate to `server/modules`, shape JSON, map errors via `server/http`) → add `features/api` caller → rewire the consumer → run `pnpm run typecheck`.
3. Preserve return shapes the UI already expects (e.g. `UploadResult`, `SimplifyResult`, `DeletePassageResult`) so consumer logic barely changes.
4. After all conversions, confirm `rg -l "^'use server'" src` returns nothing.
5. Update/extend the action tests (`studio-artifact-actions.test.ts`) into route/client tests, or move assertions to the new layer; keep coverage.
6. Run `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`.

## Success Criteria
- [ ] No `'use server'` files remain; all mutations reachable via `app/api` routes.
- [ ] Every converted route validates against a `src/shared/<domain>` schema and uses the shared auth + error helpers.
- [ ] UI consumers call backend only through `features/<d>/api/`.
- [ ] Behavior unchanged (manual smoke of upload, simplify, delete, quiz record/reset); typecheck, lint, test, build green.

## Risk Assessment
- Risk: subtle behavior drift (error handling, optimistic UI, revalidation that server actions gave for free). Mitigation: preserve return shapes; manually smoke each flow; lean on existing tests.
- Risk: `analyzeContentAction` ambiguity. Mitigation: Step 1 explicit resolve (convert vs delete) before building.
- Risk: scope creep into business logic. Mitigation: transport-only — backend modules untouched.
