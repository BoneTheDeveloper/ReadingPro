---
phase: 3
title: "Server domain modules"
status: pending
priority: P2
effort: "3h"
dependencies: [2]
---

# Phase 3: Server domain modules

## Goal

Group each server domain's routes, services, helpers, and workflows into
`src/server/modules/<domain>/`, using the same domain names as the client, and
keep every API URL unchanged.

## Context

Current layout and ownership (verified by import scan):

| Current file | Domain |
|---|---|
| `server/routes/passage.ts`, `services/passage/*` (crud, preprocessing, processing, youtube-transcript), `util/normalizer.ts`, `util/passage-text.ts`, `workflows/passage-processing/*` | passage |
| `server/routes/translate.ts`, `services/reading/translate.ts` | reading |
| `server/routes/artifact.ts`, `routes/ai-chat.ts`, `services/studio/*` (ai-chat, artifact-crud, artifact-generator, artifact-progress), `util/chat-message.ts`, `workflows/artifact-generation/*` | studio |
| `server/routes/vocabulary.ts`, `services/vocabulary/vocabulary-crud.ts` | vocabulary |
| `server/lib/auth/auth.ts`, `lib/auth/session.ts` | auth |

Each `util/*` file has exactly one importer, all in the matching domain.
Cross-domain calls that remain: studio routes and `artifact-generator` call
`passage-crud`. `app.ts` mounts `/passage`, `/artifact`, `/vocabulary`,
`/translate`, `/ai-chat`, and `/auth/*`.

## Files to Create / Modify

- Move into `src/server/modules/passage/`: `passage-routes.ts` (from `routes/passage.ts`), `passage-crud.ts`, `passage-preprocessing.ts`, `passage-processing.ts`, `youtube-transcript.ts`, `normalizer.ts`, `passage-text.ts`, `workflow/index.ts`, `workflow/steps.ts`
- Move into `src/server/modules/reading/`: `translate-routes.ts`, `translate.ts`
- Move into `src/server/modules/studio/`: `artifact-routes.ts`, `ai-chat-routes.ts`, `ai-chat.ts`, `artifact-crud.ts`, `artifact-generator.ts`, `artifact-progress.ts`, `chat-message.ts`, `workflow/index.ts`, `workflow/steps.ts`
- Move into `src/server/modules/vocabulary/`: `vocabulary-routes.ts`, `vocabulary-crud.ts`
- Move into `src/server/modules/auth/`: `auth.ts`, `session.ts`
- Delete (empty after moves): `src/server/routes/`, `src/server/services/`, `src/server/util/`, `src/server/lib/auth/`, `src/workflows/`
- Modify: `src/server/app.ts` (import paths only; mount paths unchanged)
- Modify: `eslint.config.mjs` (server block `files: ["src/server/**/*.ts"]`; client block drops `@/workflows/*`)
- Modify: `knip.json` if entry resolution changes; `README.md` server map

## Tasks & Steps

- [x] `git mv` each file per the table. Route files get a `-routes` suffix so a module's entry is obvious; other file names stay as they are.
- [x] Rewrite imports: `@/server/routes/`, `@/server/services/<d>/`, `@/server/util/`, `@/server/lib/auth/`, `@/workflows/<wf>/index` → the new module paths. Inside a module, use relative imports; across modules (studio → passage-crud), keep the `@/server/modules/passage/...` alias.
- [x] Keep `app.ts` mount paths exactly: `/passage`, `/artifact`, `/vocabulary`, `/translate`, `/ai-chat`, `/auth/*`.
- [x] Update ESLint: server block `files` → `["src/server/**/*.ts"]`; client block patterns drop `@/workflows/*` (folder no longer exists).
- [x] Update README server map (remove `workflows/`, `routes/`, `services/`, `util/`).
- [x] Commit: `refactor: group server code into domain modules`.

## Verification

- `pnpm typecheck && pnpm lint && pnpm build && pnpm exec knip` pass.
- `ls src/server` shows `app.ts lib modules security-headers.ts` and no `routes services util`; `ls src` has no `workflows`.
- `pnpm build` output lists both workflows (check the generated workflow `manifest.json` contains `passageProcessingWorkflow` and `artifactGenerationWorkflow` or their current names).
- Smoke on dev: import a YouTube passage and a PDF passage, both reach COMPLETED; generate flashcards and questions, both reach COMPLETED; translate a word; AI chat streams; vocabulary create/edit/delete.
- `curl -i localhost:3001/api/passage` without a cookie returns 401 with the same JSON body as on `main`.

## Risk and Rollback

- Risk: Workflow SDK may cache workflow IDs by file path; in-flight runs started before deploy could fail to resume after the move. Locally, clear `.workflow-data` if stale runs error. For production, deploy when no passage or artifact is PENDING, or accept that stuck runs are marked FAILED by existing failure steps.
- Rollback: revert the phase commit.
