---
title: "Phase 3: Studio Feature"
status: complete
priority: P1
dependencies: [2]
---

# Phase 3: Studio Feature

## Overview

Apply the Phase 2 shape to `studio` (artifacts + AI chat). This feature has the most mutations
and one genuine type hole: `useArtifact` returns `any` because `fetchArtifact` never parses its
response.

## Requirements

- Functional: artifact detail responses are schema-validated; `useArtifact().data` is typed.
- Functional: polling, cache seeding, and optimistic progress updates behave as they do today.
- Non-functional: `studio/api/query-keys.ts` deleted; the `export { chatKeys }` re-export from
  `queries.ts` removed so keys have exactly one import path.

## Architecture

Two independent entities live in this feature, so two factories:

```ts
// src/features/studio/api/queries.ts — no "use client"
export const artifactQueries = {
  all: () => ["artifacts"] as const,
  list: (passageId: string | null) => queryOptions({ /* poll while non-terminal */ }),
  detail: (artifactId: string | null) => queryOptions({ /* ... */ }),
};

export const chatQueries = {
  all: () => ["chat"] as const,
  history: (passageId: string | null) =>
    queryOptions({
      queryKey: [...chatQueries.all(), "history", passageId ?? ""] as const,
      queryFn: /* ... */,
      // History grows on every sent message; always refetch on mount so
      // reopening a passage shows the latest persisted turns.
      staleTime: 0,
      refetchOnMount: "always",
    }),
};
```

Preserve the existing key *values* (`["artifacts", "list", id]`, `["chat", "history", id]`) so no
cached-key semantics shift mid-refactor.

### The `useArtifact` type hole

[queries.ts:22](../../src/features/studio/api/queries.ts:22) does `return res.json()` with no
schema, so `useArtifact().data` is `any` and flows untyped into
`question-detail-view.tsx`. `fetchJson` requires a schema, which forces this closed.

`src/features/studio/schema/artifact.ts` currently exports only `studioArtifactListItemSchema`
(a discriminated union on `type` with `id`/`passageId`/`createdAt`/`status`/`progress`).
**Determine what `GET /api/artifact/[id]` actually returns before writing the schema** — read
`src/app/api/artifact/[id]/route.ts` and its service. Likely it is the list item plus a `content`
payload (questions/flashcards). Define `studioArtifactSchema` alongside the list schema, reusing
`artifactCommon` and the existing `questionProgressSchema`/`flashcardProgressSchema` variants
rather than restating fields.

If the detail payload turns out to be genuinely dynamic, use a narrow schema over the fields
`question-detail-view.tsx` actually reads instead of `z.unknown()` — a schema that validates
nothing defeats the purpose.

### Mutation renames

| Current | New |
|---|---|
| `useGenerateQuestion` | `useGenerateQuestionMutation` |
| `useRecordProgress` | `useRecordProgressMutation` |
| `useDeleteArtifact` | `useDeleteArtifactMutation` |

All three keep their `useQueryClient()` cache logic — this is precisely the case where a
`mutationOptions` factory cannot help (see plan-level decision table).

`useGenerateQuestion` currently does `setQueryData` *and* `invalidateQueries` on the same key in
`onSuccess`. The invalidate makes the optimistic seed redundant within one tick. Keep the seed
(it renders the PENDING row immediately) and drop the invalidate, or keep both deliberately —
decide during implementation and leave a comment stating why.

## Related Code Files

- Modify: `src/features/studio/api/queries.ts` (rewrite as factories, remove `chatKeys` re-export)
- Modify: `src/features/studio/api/mutations.ts` (fetchJson, renames, factory keys)
- Delete: `src/features/studio/api/query-keys.ts`
- Modify: `src/features/studio/schema/artifact.ts` (add `studioArtifactSchema`)
- Modify: `src/features/studio/component/view/questions/question-detail-view.tsx`
- Modify: `src/features/studio/component/view/ai-chat/chat-detail-view.tsx`
- Read (to derive the detail schema): `src/app/api/artifact/[id]/route.ts`, its service

## Implementation Steps

1. Read `src/app/api/artifact/[id]/route.ts` and the service behind it; derive the exact detail
   response shape.
2. Add `studioArtifactSchema` to `src/features/studio/schema/artifact.ts`, composed from the
   existing `artifactCommon` and variant schemas.
3. Rewrite `api/queries.ts` as `artifactQueries` + `chatQueries` factories using `fetchJson`.
   Remove `"use client"` and the `export { chatKeys }` line.
4. Delete `api/query-keys.ts`.
5. Rewrite `api/mutations.ts`: renames per the table, `fetchJson` for all three, keys from
   `artifactQueries.*().queryKey`. Resolve the seed-vs-invalidate question in `useGenerateQuestion`.
6. Update `question-detail-view.tsx` — `useQuery(artifactQueries.detail(id))`,
   `useRecordProgressMutation()`. Expect new type errors here once `data` stops being `any`;
   fixing them is the point of this phase, not a regression.
7. Update `chat-detail-view.tsx` — import `chatQueries` from `api/queries`, replace
   `chatKeys.history(...)` with `chatQueries.history(...).queryKey`.
8. Run `pnpm typecheck && pnpm lint && pnpm knip`.

## Todo

- [x] `studioArtifactSchema` added and matches the real route response
- [x] `artifactQueries` + `chatQueries` factories written; `query-keys.ts` deleted
- [x] `chatKeys` re-export removed
- [x] Three mutations renamed and routed through `fetchJson`
- [x] `useArtifact` consumers typecheck against the real schema
- [x] `pnpm typecheck && pnpm lint && pnpm knip` pass
- [x] Manual smoke passed

## Success Criteria

- [x] No `artifactKeys` or `chatKeys` identifier remains
- [x] `useQuery(artifactQueries.detail(id)).data` has a concrete type, not `any`
- [x] Manual: open a COMPLETED passage → generate questions → PENDING artifact row appears
      immediately → flips to COMPLETED via poll → open it → answer a question → progress persists
      across a panel close/reopen
- [x] Manual: open AI chat on a passage → history loads → send a message → reopen the passage →
      the new turn is present

## Risk Assessment

- **The detail schema is guesswork until the route is read.** Step 1 is a hard prerequisite; do
  not write the schema from the list-item shape by analogy.
- **Typing `useArtifact` will surface latent bugs in `question-detail-view.tsx`.** That component
  has been consuming `any`. Budget time for real fixes; do not paper over with casts.
- **Progress PATCH targets `/api/artifact/[id]/progress`** — confirmed to exist. Its response body
  is unverified; check before choosing the `fetchJson` response schema.
