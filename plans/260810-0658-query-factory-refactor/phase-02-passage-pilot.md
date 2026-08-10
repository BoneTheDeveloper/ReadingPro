---
title: "Phase 2: Passage Pilot"
status: complete
priority: P1
dependencies: [1]
---

# Phase 2: Passage Pilot

## Overview

Convert the `passage` feature to the `queryOptions` factory pattern. This is the pilot: it
carries the plan's only real defect (untyped RSC prefetch) and establishes the shape that
Phases 3-4 copy mechanically.

## Requirements

- Functional: `study/page.tsx` prefetch and `useQuery` reads share one key definition, and a
  shape drift in `listPassagesForUser` fails `pnpm typecheck`.
- Functional: existing UX preserved — list polls every 2s while any row is non-terminal,
  detail keeps previous data across passage switches, 404 on detail does not retry.
- Non-functional: `passage/api/query-keys.ts` deleted; `PassageNotReady` class deleted.
- Non-functional: mutation hooks renamed to `use<Verb><Entity>Mutation`.

## Architecture

### `api/queries.ts` becomes RSC-importable

Dropping `"use client"` is safe once the module exports plain option objects instead of hooks —
`queryOptions` is a runtime identity function with no React dependency. That removes the entire
reason `query-keys.ts` was split out (its file comment states the `"use client"` barrier as the
cause).

```ts
// src/features/passage/api/queries.ts  — no "use client"
import { keepPreviousData, queryOptions, skipToken } from "@tanstack/react-query";
import { fetchJson, isApiError } from "@/lib/api/fetch-json";
import { passageSchema, passageListSchema } from "@/features/passage/schema";

export const passageQueries = {
  all: () => ["passages"] as const,

  list: () =>
    queryOptions({
      queryKey: [...passageQueries.all(), "list"] as const,
      queryFn: ({ signal }) => fetchJson("/api/passage", passageListSchema, { signal }),
      // The list is the single polling loop while any row is non-terminal.
      // Detail is reactive only and rides the shared cache.
      refetchInterval: (query) =>
        (query.state.data ?? []).some((p) => p.status !== "COMPLETED") ? 2000 : false,
    }),

  detail: (passageId: string | null) =>
    queryOptions({
      queryKey: [...passageQueries.all(), "detail", passageId ?? ""] as const,
      queryFn:
        passageId === null
          ? skipToken
          : ({ signal }) => fetchJson(`/api/passage/${passageId}`, passageSchema, { signal }),
      placeholderData: keepPreviousData,
      // 404 means the row exists but is still PENDING. The list poll flips it
      // to COMPLETED and this re-renders — retrying here would only add noise.
      retry: (failureCount, error) =>
        isApiError(error) && error.status === 404 ? false : failureCount < 3,
    }),
};
```

Two substitutions worth calling out:

**`skipToken` replaces `enabled` + the `passageId!` non-null assertion.** Both work; `skipToken`
is the v5 idiom and removes the assertion. If the implementer prefers `enabled: passageId !== null`,
that is acceptable — but then the `!` assertion stays and `TData` is still correctly `undefined`-able.
Pick one and use it consistently across Phases 3-4.

**`PassageNotReady` is deleted.** Verified safe: `grep` shows no consumer branches on it.
[study-workspace.tsx:88](../../src/app/(dashboard)/study/_component/study-workspace.tsx:88) reads
only `detail.data ?? null`, and `detailPassageId` is already gated to `status === "COMPLETED"`,
so the 404 path is defensive. The `retry: false` on 404 preserves the one behavior that mattered.

### RSC prefetch: explicit annotation, not inference

```tsx
// src/app/(dashboard)/study/page.tsx
import type { PassageListItem } from "@/features/passage/schema";

const queryClient = getQueryClient();
await queryClient.prefetchQuery({
  ...passageQueries.list(),
  // Server path: call the service directly. The annotation is what makes a
  // service shape drift a compile error — do not let TS re-infer here.
  queryFn: (): Promise<PassageListItem[]> => listPassagesForUser(session.user.id),
});
```

The explicit `Promise<PassageListItem[]>` return annotation is load-bearing. Without it, TS may
re-infer `TQueryFnData` from the override and widen instead of erroring — exactly the failure
mode this plan exists to close.

### Key access

`setQueryData`/`removeQueries`/`cancelQueries` now read the key off the factory:

```ts
queryClient.setQueryData(passageQueries.detail(passage.id).queryKey, passage);
```

`queryOptions` brands that key as `DataTag<TKey, Passage>`, so passing a wrong-shaped value is
now a type error — it is not today.

## Related Code Files

- Modify: `src/features/passage/api/queries.ts` (rewrite as factory)
- Modify: `src/features/passage/api/mutations.ts` (fetchJson, rename, key source)
- Delete: `src/features/passage/api/query-keys.ts`
- Modify: `src/app/(dashboard)/study/page.tsx`
- Modify: `src/app/(dashboard)/study/_component/study-workspace.tsx`
- Modify: `src/features/passage/hook/use-passage-library.ts`
- Modify: `src/features/passage/component/model/upload-modal.tsx`

## Implementation Steps

1. Rewrite `api/queries.ts` as the `passageQueries` factory above. Remove `"use client"`,
   `usePassages`, `usePassage`, and the `PassageNotReady` class.
2. Delete `api/query-keys.ts`.
3. Rewrite `api/mutations.ts`:
   - `useCreatePassage` → `useCreatePassageMutation`; body becomes
     `fetchJson("/api/passage", passageSchema, { method: "POST", headers, body })`.
     Drops the hand-rolled `body?.error?.message` read — `fetchJson` does it.
   - `useDeletePassage` → `useDeletePassageMutation`. `DELETE` returns no useful body; call
     `fetchJson(url, z.unknown(), { method: "DELETE" })` **or** keep a bare `fetch` + explicit
     `ApiError` throw. Prefer the former for one code path; confirm the route's response body
     first (`src/app/api/passage/[id]/route.ts`).
   - Replace all `passageKeys.*` with `passageQueries.*().queryKey`.
4. Update `study/page.tsx` prefetch with the annotated override.
5. Update `study-workspace.tsx`: `const detail = useQuery(passageQueries.detail(detailPassageId))`.
6. Update `use-passage-library.ts`: `useQuery(passageQueries.list())`,
   `useDeletePassageMutation()`, and both `setQueryData` calls to use factory keys.
7. Update `upload-modal.tsx` to `useCreatePassageMutation`.
8. Run `pnpm typecheck && pnpm lint && pnpm knip`.
9. Manual smoke (see Success Criteria) — the parse-on-create path cannot be verified statically.

## Todo

- [x] `passageQueries` factory written; `query-keys.ts` deleted
- [x] `PassageNotReady` removed, 404 retry behavior preserved
- [x] Mutations renamed and routed through `fetchJson`
- [x] `study/page.tsx` uses annotated `queryFn` override
- [x] All 4 consumer files updated
- [x] `pnpm typecheck && pnpm lint && pnpm knip` pass
- [x] Manual smoke passed

## Success Criteria

- [x] No `passageKeys` identifier remains in the codebase
- [x] Deliberately breaking `listPassagesForUser`'s return shape (e.g. rename `title` → `name`)
      produces a `pnpm typecheck` error in `study/page.tsx` — **verify this, then revert**.
      This is the phase's acceptance test.
- [x] Manual: upload a text passage → row appears as PENDING → flips to COMPLETED within ~2s of
      processing finishing → detail renders → delete removes it optimistically
- [x] Manual: hard-refresh `/study` → list renders without a client fetch flash (hydration intact)

## Risk Assessment

- **`passageSchema.parse` on the create response.** `POST /api/passage` returns the Prisma row at
  201 and `passageSchema` is a flat projection of that row with `cefrLevel` nullable — parse
  should pass for a PENDING row. If it throws, the fix is to align the schema, not to drop the
  parse. Covered by the manual smoke step.
- **Extra fields in the prefetched payload.** `listPassagesForUser` may return more columns than
  `passageListItemSchema` picks. TS allows the assignment (not an object literal) and the extra
  fields dehydrate harmlessly, but the client cache will hold unvalidated extras on the server
  path only. Acceptable; note it rather than adding a server-side parse.
- **`skipToken` vs `enabled` inconsistency across phases.** Decide in this phase, record the
  choice in Phase 5's convention doc.
