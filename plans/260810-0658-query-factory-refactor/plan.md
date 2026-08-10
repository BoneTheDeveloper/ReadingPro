---
title: "Query Factory Refactor"
description: "Convert per-feature TanStack Query hooks to queryOptions factories, add a shared fetchJson/ApiError transport, and make RSC prefetch type-linked to client reads."
status: complete
priority: P1
effort: "1-2d"
tags: [refactor, tanstack-query, transport]
created: 2026-08-10
---

# Query Factory Refactor

## Overview

Four features (`passage`, `studio`, `vocabulary`, `reading`) each hand-roll their own
query hooks, key factories, and `if (!res.ok) throw new Error(...)` fetchers. This plan
replaces that with the TanStack-sanctioned `queryOptions` factory pattern plus one shared
`fetchJson`/`ApiError` transport helper.

The concrete defect this fixes: [study/page.tsx:12](../../src/app/(dashboard)/study/page.tsx:12)
prefetches `passageKeys.list()` with `listPassagesForUser()` while
[api/queries.ts:52](../../src/features/passage/api/queries.ts:52) reads the same key via
`fetch("/api/passage")` + `passageListSchema.parse`. Nothing type-links the two — a shape
drift in the service silently hydrates unvalidated data into the client cache.

### Decisions locked before planning

| Decision | Choice | Evidence |
|---|---|---|
| Error layer scope | `fetchJson` + `ApiError` only; `<ErrorState />` and global toasts deferred | User selection. `ErrorState` does not exist in `src/`; building it touches every consumer and the `use-upload-flow` error panel. |
| Mutations → `mutationOptions`? | **No.** Keep `use<Verb><Entity>Mutation` hooks | `mutationOptions` *is* exported from `@tanstack/react-query` (docs/framework/react/reference/mutationOptions.md), but its documented payoff is sharing with `useIsMutating`/`queryClient.isMutating` — **zero usages in this repo**. Every mutation here needs `useQueryClient()` for cache writes, which a plain factory cannot call. TanStack's own docs show the custom-hook pattern (`useMutateTodo`) for exactly this case. |
| Rollout | `passage` pilot → `studio` → `vocabulary`+`reading` | Passage carries the only real hydration risk; each feature is an independently revertable commit. |
| `api/` vs `hook/` split | Keep. `api/` = server state, `hook/` = client state/orchestration | The existing split is already correct: `use-passage-library`, `use-upload-flow`, `use-scroll-progress` are UI orchestration. Moving `useQuery` wrappers into `hook/` would merge transport with UI state. |

### Target shape

```ts
// src/features/passage/api/queries.ts — NO "use client", importable from RSC
export const passageQueries = {
  all: () => ['passages'] as const,
  list: () => queryOptions({
    queryKey: [...passageQueries.all(), 'list'],
    queryFn: ({ signal }) => fetchJson('/api/passage', passageListSchema, { signal }),
    refetchInterval: (q) =>
      (q.state.data ?? []).some((p) => p.status !== 'COMPLETED') ? 2000 : false,
  }),
  detail: (id: string | null) => queryOptions({ /* ... */ }),
}
```

`queryOptions` brands `queryKey` as `DataTag<TKey, TData>`, so `setQueryData` calls in
`use-passage-library` become type-checked against the query's data type — today they are not.
This also removes the reason `query-keys.ts` exists (the `"use client"` import barrier for RSC),
deleting 3 files.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | One shared `fetchJson`/`ApiError` transport; no feature parses `res.ok` by hand | P1 |
| 2 | RSC prefetch and client read share one typed key; shape drift becomes a compile error | P1 |
| 3 | `queryOptions` factories replace bespoke `useX()` query hooks in all 4 features | P1 |
| 4 | Delete dead code (`vocabulary` queries, 3× `query-keys.ts`, `PassageNotReady`, `useTranslation` state mirror) | P2 |
| 5 | `CLAUDE.md` describes what the code actually does | P2 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Phase 1: Shared Transport Layer](./phase-01-shared-transport.md) | Pending |
| 2 | [Phase 2: Passage Pilot](./phase-02-passage-pilot.md) | Pending |
| 3 | [Phase 3: Studio Feature](./phase-03-studio-feature.md) | Pending |
| 4 | [Phase 4: Vocabulary and Reading](./phase-04-vocabulary-and-reading.md) | Pending |
| 5 | [Phase 5: Convention Doc and Sweep](./phase-05-convention-doc-and-sweep.md) | Pending |

Dependencies: 2 → 1. 3 → 2. 4 → 2. 5 → 3, 4.
Phases 3 and 4 are independent of each other and may run in either order once 2 lands.

## Non-Goals

- Building `<ErrorState />`, global error toasts, or `MutationCache` message wiring.
- Changing the transport contract — route handlers, services, and workflows stay as they are.
- Adding `useSuspenseQuery` or streaming/`prefetch`-without-await patterns.
- Touching `src/lib/error/app-error.ts` (server error model) beyond type-only imports.

## Success Criteria

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm knip` all pass at the end of every phase
- [ ] Zero `query-keys.ts` files remain under `src/features/`
- [ ] Zero `if (!res.ok) throw new Error(` occurrences remain under `src/features/`
- [ ] `study/page.tsx` prefetch uses `passageQueries.list()`'s key with an explicitly typed `queryFn` override
- [ ] Every `queryFn` validates its response through a Zod schema (fixes `useArtifact` returning `any`)
- [ ] All mutation hooks named `use<Verb><Entity>Mutation`
- [ ] `CLAUDE.md` "API & Query Structure" and "Error Handling" sections match the shipped code
- [ ] Manual smoke: upload a passage → PENDING row appears → flips to COMPLETED → detail renders → generate questions → save a vocabulary word

## Risks

| Risk | Mitigation |
|---|---|
| Removing the `PassageNotReady` sentinel changes 404 UX | Verified no consumer branches on it — `study-workspace.tsx` only reads `detail.data ?? null`, and `detailPassageId` is already gated to `status === "COMPLETED"`. Behavior preserved via `retry: false` on 404. |
| Adding `passageSchema.parse` to the create mutation could throw where the old cast silently passed | `passageSchema` is a flat projection of the Prisma row and `POST /api/passage` returns that row at 201 with `cefrLevel` nullable — parse is safe. Confirm in Phase 2 with a real upload. |
| Deleting `vocabulary/api/queries.ts` removes a future-intended surface | It is dead today (grep: `useVocabularyItems` has zero consumers; the page uses RSC props). `pnpm knip` confirms. Re-add from the factory pattern when a client read actually needs it. |
| `queryOptions` spread-override in RSC may re-infer rather than type-check the service output | Do not rely on inference. Annotate the override explicitly: `queryFn: (): Promise<PassageListItem[]> => listPassagesForUser(id)`. |
| Large mechanical diff across features | Phased per feature, each an independently revertable commit with typecheck/lint gate. |

## Related Work

- `plans/260802-1622-translation-react-query/` — COMPLETE. Created `reading/api/mutations.ts`
  and its `useTranslation` wrapper. Phase 4 supersedes that wrapper. No blocking relationship.

## Open Questions

None. All three planning decisions were resolved by the user; the `mutationOptions` question was
resolved by documentation research plus a zero-usage grep for `useIsMutating`.
