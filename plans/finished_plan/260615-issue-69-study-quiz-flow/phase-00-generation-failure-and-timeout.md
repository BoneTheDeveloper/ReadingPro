---
phase: 0
title: "Generation failure contract + timeout"
status: complete
priority: P0
effort: "5h"
dependencies: []
---

# Phase 0: Generation failure contract + timeout

> **Priority phase — ship before Phases 1-3.** These are the two live reliability
> bugs in the Study quiz flow. Phases 1-3 (quiz-attempt route, quiz UX, tests)
> assume generation already settles cleanly and a failed card explains itself.

## Overview

Two coupled defects in quiz **generation** (not attempt-saving — that is Phase 2):

1. **Opaque failure.** When question generation fails, the card shows a generic
   "failed" label. The backend's real reason (`No questions generated`,
   `validation failed`, upstream 502, …) is thrown, returned once as
   `{ error }`, copied into the global `state.error`, then lost. The DB row keeps
   only `status: "failed"` — no reason. User cannot tell why; developer cannot
   tell from the row. On reload the reason is gone entirely.
2. **Progress hell loop.** The client fetch (`postJson`) has no timeout. If a
   generation request hangs, the `generateQuizArtifact` promise never settles, so
   the artifact stays `status: "generating"` in client state. The action lock
   (`isActionLocked` in `studio-panel.tsx`) blocks every further quiz generation
   while any quiz artifact is `generating` — so the "2nd generation" can never even
   start. The only escape today is the 5-minute orphan reaper, and only on the next
   passage fetch.

Both are solved by one mechanism: a **single shared error-code contract** that DB,
backend, and frontend all reference, plus a **timeout** that guarantees a hung
generation always lands in `failed` with the `TIMEOUT` code (releasing the lock),
and a **Retry** affordance on the failed card.

## Confirmed decisions

- **Storage:** structured `errorCode` (stable enum) **+** optional `errorDetail`
  (raw developer message). One shared union drives DB persistence, the API
  response, and the localized user message. User sees friendly i18n text; developer
  reads `errorCode` + `errorDetail` + Sentry.
- **Timeout scope:** client **and** backend. Client `AbortController` (~45s) is the
  primary fix (always settles the promise → flips to `failed` → releases the lock).
  Backend wraps the LLM call with the same budget so a hung upstream returns an
  error code instead of holding a serverless invocation open.
- **Recovery:** failed card shows the reason **+ a Retry button** that re-runs
  generation on the same artifact. Lock auto-releases once status leaves
  `generating`, so a 2nd generation is never blocked.

## The shared contract (no BE/FE/DB conflict)

One union defined once in `src/lib/study/shared/studio-artifact-types.ts`, imported
by the service, the fail action, and the UI:

```ts
export type StudioArtifactErrorCode =
  | "GENERATION_FAILED"  // upstream produced nothing usable (500 fallback)
  | "NO_QUESTIONS"       // model returned zero questions
  | "VALIDATION_FAILED"  // every generated question failed validation
  | "UPSTREAM_ERROR"     // study service rejected the request (502)
  | "TIMEOUT"            // client/backend timed out, or orphan reaper reaped it
  | "UNKNOWN";           // unmapped error

export const STUDIO_GENERATION_TIMEOUT_MS = 45_000; // client abort + backend race
```

Flow: backend throws a typed error carrying a `code` → route returns
`{ error, code }` → client reads `code` (or `TIMEOUT` on abort, `UNKNOWN`
otherwise) → `studioFailArtifactAction({ artifactId, errorCode, errorDetail })`
persists it → card renders the localized message for that `code`. DB is the source
of truth, so the reason survives reload.

## Related Code Files

- Modify: `prisma/schema/studio.prisma`
  - `StudioArtifact`: add `errorCode String?` and `errorDetail String?` (both
    nullable; existing `failed` rows stay null → render generic message). Migrate.
- Modify: `src/lib/study/shared/studio-artifact-types.ts`
  - Add `StudioArtifactErrorCode`, `STUDIO_GENERATION_TIMEOUT_MS`; add
    `errorCode?`/`errorDetail?` to the `StudioArtifact` interface.
- Modify: `src/lib/study/passage/passage-study.service.ts`
  - `PassageStudyServiceError` carries `code: StudioArtifactErrorCode`. Set the three
    throw sites to `NO_QUESTIONS` / `VALIDATION_FAILED` / `GENERATION_FAILED`.
  - Wrap the LLM generation call with a `STUDIO_GENERATION_TIMEOUT_MS` race; on
    timeout throw with `code: "TIMEOUT"`.
- Modify: `src/app/api/studio-questions/route.ts`
  - Return `{ error, code }`: map `PassageStudyServiceError.code` (502), and the
    500 fallback → `UNKNOWN`. Keep auth/ownership/zod branches.
- Modify: `src/lib/api/shared/api-response-schema.ts`
  - Add optional `code: z.string()` to `apiErrorResponseSchema`.
- Modify: `src/lib/study/passage/studio-artifacts-service.ts`
  - `failStudioArtifact(artifactId, userId, errorCode?, errorDetail?)` persists the
    reason. Orphan reaper in `fetchStudioArtifacts` sets `errorCode: "TIMEOUT"`.
    `toStudioArtifact` maps `errorCode`/`errorDetail` through.
- Modify: `src/features/study/actions/studio-artifact-actions.ts`
  - `studioFailArtifactAction({ artifactId, errorCode?, errorDetail? })` pass-through.
- Modify: `src/features/study/api/api-utils.ts`
  - `postJson`/`patchJson` accept optional `timeoutMs`; wire an `AbortController`
    (or `AbortSignal.timeout`). Abort → throw a typed timeout error.
- Modify: `src/features/study/api/studio-questions-client.ts`
  - Pass `STUDIO_GENERATION_TIMEOUT_MS`; return `{ error, code }` from the response;
    map an abort to `code: "TIMEOUT"`.
- Modify: `src/features/study/hooks/use-study-actions.ts`
  - In `generateQuizArtifact`, all three failure branches (result-error,
    passage-switch, catch) resolve an `errorCode` + `errorDetail`, set them on the
    artifact via `updateArtifactStatus(..., { status: "failed", errorCode, errorDetail })`,
    and call `studioFailArtifactAction` with them. Add a `retryQuizArtifact(passageId,
    artifactId)` that clears the error, re-sets `status: "generating"`, and re-runs.
- Modify: `src/features/study/ui/studio/studio-panel.tsx`
  - Failed quiz card renders the localized message for `artifact.errorCode` + a
    Retry button wired to `retryQuizArtifact`. (Lock already releases on
    status leaving `generating` — no lock change needed.)
- i18n: add to the `Study` namespace in every locale (`en.json`, `vi.json`): a
  message per `StudioArtifactErrorCode`, a generic fallback, and `retry`.

## Implementation Steps

1. Add `StudioArtifactErrorCode`, `STUDIO_GENERATION_TIMEOUT_MS`, and the interface
   fields to `studio-artifact-types.ts`.
2. Prisma: add `errorCode` / `errorDetail` to `StudioArtifact`; `pnpm run db:migrate:dev`.
3. Service: give `PassageStudyServiceError` a `code`; tag the three throw sites; add
   the backend timeout race (`TIMEOUT`).
4. Route: return `{ error, code }`; extend `apiErrorResponseSchema` with optional `code`.
5. Persistence: extend `failStudioArtifact` + orphan reaper + `toStudioArtifact`;
   extend `studioFailArtifactAction`.
6. Client: add `timeoutMs` to `postJson`/`patchJson`; surface `code` + map abort to
   `TIMEOUT` in `studio-questions-client.ts`.
7. Hook: resolve + persist `errorCode`/`errorDetail` on every failure branch in
   `generateQuizArtifact`; add `retryQuizArtifact`.
8. UI: render the localized reason + Retry on the failed card; add i18n keys to all
   locales.
9. Manual check: (a) force a failure (e.g. stub the service to throw `NO_QUESTIONS`)
   → card shows the reason, reload still shows it; (b) stall the request past 45s →
   card flips to a timeout reason, lock releases, a 2nd generation starts, Retry works.
10. `pnpm run typecheck` + `pnpm run lint`.

## Success Criteria

- [ ] A failed generation persists `errorCode` (+ `errorDetail`) on the row; the
      reason survives reload.
- [ ] Failed card shows a localized, human reason (not just "failed") and a Retry button.
- [ ] A hung generation always settles to `failed` within `STUDIO_GENERATION_TIMEOUT_MS`
      (client), releasing the action lock so the next/2nd generation is not blocked.
- [ ] Backend generation cannot hang past the timeout budget.
- [ ] `errorCode` union is referenced by DB-mapping, service, and UI from one source.
- [ ] `pnpm run typecheck` + `pnpm run lint` pass.

## Risk Assessment

- Timeout too short could reap a slow-but-valid generation: set the client budget at
  or above worst-case generation time and keep the 5-min orphan reaper as the
  backstop. `STUDIO_GENERATION_TIMEOUT_MS` is a single tunable constant.
- Retry reusing the same `artifactId` must clear the prior `errorCode`/`errorDetail`
  on success so a re-run card does not show a stale reason.
- Adding `code` to the error envelope is additive/optional — existing callers and
  the `{ error }` shape stay valid.
