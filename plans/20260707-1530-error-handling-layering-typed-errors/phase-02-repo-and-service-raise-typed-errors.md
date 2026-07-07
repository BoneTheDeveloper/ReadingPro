---
phase: 2
title: "Repo and service raise typed errors"
status: pending
priority: P2
effort: "1.5h"
dependencies: [1]
---

# Phase 2: Repo and service raise typed errors

## Overview

Convert every ownership / not-found throw-site in repo + service layers from plain `Error`
(or `findUniqueOrThrow`) to `NotFoundError` (from Phase 1). This is where raw errors become domain
errors. After this phase the routes still string-match (unchanged until Phase 3), so both mechanisms
briefly coexist — that is fine because `NotFoundError.message` (`"<resource> not found."`) still
satisfies the old matcher, so no 404 breaks mid-migration.

## Requirements

- Functional: not-found / not-owned paths still produce a 404-eligible error; existing routes keep working via string-match until Phase 3.
- Non-functional: no `findUniqueOrThrow` remains in the converted ownership paths (option B); Prisma error types not leaked upward.

## Architecture

Option (B) merge pattern — replace throw + `findUniqueOrThrow` with a single null-or-owner check:

```ts
// before
const item = await prisma.vocabularyItem.findUniqueOrThrow({ where: { id: itemId } });
if (item.userId !== params.userId) throw new Error(`No vocabulary item found for user`);

// after
const item = await prisma.vocabularyItem.findUnique({ where: { id: itemId } });
if (!item || item.userId !== params.userId) throw new NotFoundError("Vocabulary item");
```

`NotFoundError.message` becomes `"Vocabulary item not found."` — still contains "vocabulary item" +
"not found", so the old `isOwnershipMissError` in the still-unmigrated routes keeps mapping it to 404
during the P2→P3 window.

## Related Code Files

Convert to `NotFoundError` (import from `@/lib/http/route-errors`):

- Modify: `src/features/vocabulary/db/vocabulary-items.repository.ts` — lines ~184 (`findUniqueOrThrow`→`findUnique`) + ~189 (throw). Resource label: `"Vocabulary item"`.
- Modify: `src/features/vocabulary/db/vocabulary-item-progress.repository.ts` — lines ~11, ~16, ~30, ~35 (two `findUniqueOrThrow` + two throws). Resource: `"Vocabulary item"`.
- Modify: `src/features/vocabulary/db/sets/vocabulary-sets.repository.ts` — lines ~127, ~146, ~163 (three throws). Resource: `"Vocabulary set"`.
- Modify: `src/features/passage/services/studio-artifacts.service.ts` — lines ~92, ~110 (two plain throws). This file already has `ArtifactNotFoundError` (line ~16); **reuse that class**, do not introduce `NotFoundError` here (keeps the artifact-specific message + name). Confirm route `studio/questions` maps it — see Phase 3.

Leave untouched (NOT ownership/404):
- `src/features/passage/db/passage-queries.ts:90` (Zod validation → 400/internal)
- `src/features/reading/db/translation-provider.ts:34,46` (provider/5xx)

## Implementation Steps

1. Re-grep each file for the exact current line numbers (they shift as you edit).
2. Vocabulary repos: apply the option-B merge pattern (`findUnique` + `!item || not-owner` → `NotFoundError`). Import `NotFoundError`.
3. `vocabulary-sets.repository.ts`: the three throws — inspect each; apply same pattern (merge with the preceding lookup where one exists, else straight `throw new NotFoundError("Vocabulary set")`).
4. `studio-artifacts.service.ts:92,110`: replace `throw new Error("Artifact not found or access denied")` with `throw new ArtifactNotFoundError(artifactId)` (class already in file) — this is an internal consistency fix, not a `NotFoundError` conversion.
5. Verify a repository never imports `schemas/` (unchanged) and only adds an import of `NotFoundError` from `@/lib/http/route-errors`. Note: `route-errors.ts` is `server-only` — repos are server-only too, so the import is legal. Confirm no client bundle pulls a repo (it must not).
6. `pnpm run typecheck && pnpm run lint`.

## Success Criteria

- [ ] All listed vocabulary throw-sites raise `NotFoundError`; `findUniqueOrThrow` replaced by `findUnique`+null-check in those paths
- [ ] `studio-artifacts.service.ts` uses `ArtifactNotFoundError` at both sites (no plain `Error`)
- [ ] `passage-queries.ts` and `translation-provider.ts` untouched
- [ ] `pnpm run typecheck && pnpm run lint` pass
- [ ] Existing routes still return 404 on not-found (string-match still matches `NotFoundError.message`) — spot-check one vocabulary delete

## Risk Assessment

Medium. The `findUniqueOrThrow`→`findUnique` swap changes control flow: a missing row previously threw
P2025, now returns `null` handled by the same branch as not-owned. Verify no code after the lookup
assumed a non-null item beyond the ownership check. `vocabulary-item-progress.repository.ts` has two
lookups — check both feed into an ownership guard and nothing else dereferences the item assuming existence.
