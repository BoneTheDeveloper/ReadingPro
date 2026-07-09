---
phase: 5
title: "Remove manual spans/breadcrumbs"
status: completed
priority: P2
effort: "1.5h"
dependencies: [4]
---

# Phase 5: Remove manual spans/breadcrumbs

## Overview

Delete all hand-written `Sentry.startSpan` / `Sentry.addBreadcrumb`. Sentry
auto-instrumentation (HTTP, Prisma via prismaIntegration, browser tracing) is enough
for MVP. Removes noise + tight coupling. Error captures already handled (Phase 4).

## Requirements

- Functional: remove startSpan/addBreadcrumb; preserve any error `captureException`
  that Phase 4 designated KEEP/CONVERT (do not delete those).
- Non-functional: remove now-unused `import * as Sentry` where no Sentry call remains.

## Files + calls to remove (verified inventory)

| File | Remove |
|------|--------|
| `features/studio-panel/ui/studio/chat/chat-panel.tsx` | startSpan (L50,101,123,144), addBreadcrumb (L61,92,117,138). Keep error path → captureClientError (Phase 4) |
| `features/upload/db/upload-workflow.ts` | addBreadcrumb (L38,103), startSpan (L54,108) |
| `features/upload/services/upload-service.ts` | addBreadcrumb (L19,41) |
| `features/learning-session/hooks/use-learning-session-tracker.ts` | addBreadcrumb (L24) |
| `features/reading/services/inline-translate.service.ts` | startSpan (L126) |
| `features/reading/db/word-translate.ts` | startSpan (L10) |
| `features/studio-panel/ui/studio/lookup/lookup-panel.tsx` | addBreadcrumb (L29) |
| `features/ai-chat/services/chat-service.ts` | startSpan (L122) — dọn luôn (AI tracing) |
| `features/dictionary/hooks/use-save-dictionary-vocabulary.ts` | addBreadcrumb (L37,64,71) |
| `features/passage/services/passage-study.service.ts` | addBreadcrumb (L48), startSpan (L53) |
| `app/[locale]/(dashboard)/study/_components/study-workspace.tsx` | addBreadcrumb x10 (L127..361) |

## NOT touched here

- `Sentry.setUser` in `src/lib/auth/auth-server.ts:27,40` — **KEEP (confirmed by user)**.
  User-context enrichment for triage ("users affected", filter by user); NOT a manual span.
  Do not remove the `import * as Sentry` in this file.
- `with-action.ts` startSpan (L39) — KEEP (server-action boundary span, intentional).

## Implementation Steps

1. Per file: delete startSpan wrapper — unwrap to plain call
   `await Sentry.startSpan({...}, async () => body)` → `body` (keep the awaited work).
2. Delete addBreadcrumb statements.
3. Remove `import * as Sentry from "@sentry/nextjs"` if file has zero remaining Sentry refs.
4. `pnpm run typecheck && pnpm run lint` after each 2-3 files.
5. Smoke: run app, exercise upload + chat + study flows — no runtime errors.

## Success Criteria

- [ ] Zero `Sentry.startSpan` outside `with-action.ts`.
- [ ] Zero `Sentry.addBreadcrumb` in codebase.
- [ ] Unused Sentry imports removed.
- [ ] setUser retained; boundary captures retained.
- [ ] Typecheck + lint pass; smoke flows OK.

## Risk Assessment

- **Risk**: unwrapping startSpan changes control flow (return value lost).
  **Mitigation**: preserve the awaited expression + its return; only strip the wrapper.
- **Risk**: lose useful trace context (e.g. AI model id, pdf-parse timing).
  **Mitigation**: accepted for MVP per decision; auto-instrumentation covers HTTP/Prisma.
  Re-add targeted spans later if a real perf question arises (YAGNI now).
