---
phase: 4
title: "Shared by domain, Prisma decoupling"
status: pending
priority: P2
effort: "3h"
dependencies: [3]
---

# Phase 4: Shared by domain, Prisma decoupling

## Goal

Organize `src/shared/` by the same domain names, make it independent of generated
Prisma code, and move the Prisma client output under `src/server/`.

## Context

- `shared/contracts/` holds `api-error.ts`, `passage.ts`, `reading.ts`, `studio-artifact.ts`, `studio-chat.ts`, `vocabulary.ts`; `shared/passage/` holds `upload-config.ts`, `youtube-url.ts`.
- Four shared contracts import enums from `@/generated/prisma/enums`: `CEFRLevel`, `ProcessingStatus`, `SourceType`, `PartOfSpeech`, `StudioArtifactType`, `VocabularyStatus`.
- Twelve client files import the same enums (value or type) from `@/generated/prisma/enums`; ESLint currently whitelists that path for client and shared.
- `prisma/schema.prisma` sets `output = "../src/generated/prisma"`; `.gitignore` ignores `/src/generated/prisma`.

## Files to Create / Modify

- Create: `src/shared/enums.ts` — `as const` objects plus same-named types for the six enums, in the same shape Prisma generates (`export const ProcessingStatus = { PENDING: "PENDING", ... } as const; export type ProcessingStatus = (typeof ProcessingStatus)[keyof typeof ProcessingStatus];`)
- Create: `src/server/lib/enum-sync.ts` — compile-time checks that each shared enum equals the Prisma enum type (two-way assignability), so a schema change breaks `pnpm typecheck`
- Move: `shared/contracts/api-error.ts` → `shared/api-error.ts`
- Move: `shared/contracts/passage.ts` → `shared/passage/schema.ts`; `reading.ts` → `shared/reading/schema.ts`; `vocabulary.ts` → `shared/vocabulary/schema.ts`; `studio-artifact.ts` → `shared/studio/artifact.ts`; `studio-chat.ts` → `shared/studio/chat.ts`
- Keep: `shared/passage/upload-config.ts`, `shared/passage/youtube-url.ts`
- Modify: `prisma/schema.prisma` (`output = "../src/server/db/generated"`), `.gitignore`, `README.md`
- Modify: all importers of `@/shared/contracts/*` and `@/generated/prisma/*`
- Modify: `eslint.config.mjs` (drop the `!@/generated/prisma/enums` exception; shared may import only `@/shared/*`)

## Tasks & Steps

- [x] Write `src/shared/enums.ts` by copying the member lists from the current generated `enums.ts`; keep member order identical.
- [x] Write `src/server/lib/enum-sync.ts` with a type-level equality helper per enum. Import it from `src/server/lib/prisma.ts` as a type-only side effect (or reference it so `knip` does not flag it; add it to `knip.json` entry if needed).
- [x] Replace `@/generated/prisma/enums` with `@/shared/enums` in shared contracts and all client files. Server files may keep using Prisma enums directly.
- [x] `git mv` the shared contract files; rewrite `@/shared/contracts/...` imports across client and server.
- [x] Change Prisma `output` to `../src/server/db/generated`, update `.gitignore` to `/src/server/db/generated`, run `pnpm db:generate`, delete the old `src/generated/`, and rewrite `@/generated/prisma/` → `@/server/db/generated/` in server files.
- [x] Update ESLint: client block bans `@/server/*` with no exception; shared block regex allows only `^@/shared/`.
- [x] Update the README directory map and the sentence about client importing `@/generated/prisma/enums`.
- [x] Commit: `refactor: organize shared by domain and decouple it from prisma`.

## Verification

- `pnpm typecheck && pnpm lint && pnpm build && pnpm exec knip` pass.
- `git grep -n "generated/prisma" src/client src/shared` returns nothing; `ls src` shows only `client server shared`.
- Temporarily add a member to one Prisma enum in `schema.prisma`, run `pnpm db:generate && pnpm typecheck`: it fails in `enum-sync.ts`. Revert and regenerate.
- CI parity: `pnpm exec prisma generate` with dummy `DATABASE_URL`/`DIRECT_URL` still succeeds (the CI step does not use a path).
- Client bundle check: `git grep -n "server/db" build/client` after `pnpm build:web` returns nothing.
- Smoke: studio grid icons per artifact type, CEFR badge, source list status icons, vocabulary part-of-speech and status filters render as before.

## Risk and Rollback

- Risk: duplicated enum lists drift from Prisma. Mitigated by the compile-time sync check.
- Risk: `postinstall` runs `prisma generate`; stale `src/generated` on other machines is harmless but should be deleted. Mention it in the commit body.
- Rollback: revert the phase commit and run `pnpm db:generate`.
