# Fix vocabulary CRUD: 405 on list + create not refreshing UI

## Context

The vocabulary page has two related bugs that surface only after the user
performs a write:

1. **Update fails with 405.** The browser console shows
   `GET /api/vocabulary 405` followed by an `ApiError` toast. The RSC prefetch
   hides this until any mutation fires `queryClient.invalidateQueries(...)`,
   which forces a client-side refetch on the list query.

2. **Create doesn't refresh the UI.** After a successful `POST /api/vocabulary`
   the page either stays empty or shows the empty state, even though the new
   row was saved. Same `405` is the trigger — the list refetch fails, the
   query goes into error state, `listQuery.data` becomes `undefined`, and
   `filteredItems` falls back to `[]`.

Root cause is one missing piece: **`src/app/api/vocabulary/route.ts` only exports
`POST`**. The list query calls `GET /api/vocabulary` (see
`src/features/vocabulary/api/queries.ts:15`). The RSC page at
`src/app/(dashboard)/vocabulary/page.tsx:15-26` sidesteps this by prefetching
with the service function directly, which is why the initial render looks fine
— the bug only appears once the cache is invalidated.

`PATCH /api/vocabulary/[id]` works because the `[id]/route.ts` exports it
correctly. The 405 in the original report was on the list refetch, not on PATCH
itself; the "update failed" symptom is the list query dying after the mutation
invalidates the cache.

Stats works (`GET /api/vocabulary/stats` is exported).

## Fix

### 1. Add the missing `GET` handler — `src/app/api/vocabulary/route.ts`

Replace the file contents with a handler that owns both verbs. The list
service already exists and returns `VocabularyItem[]` which matches
`VocabularyListResponseSchema`.

```ts
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import {
  listVocabularyItemsForUser,
  storeVocabularyItemForUser,
} from "@/features/vocabulary/server/services/vocabulary-crud";
import { VocabularyInputSchema } from "@/features/vocabulary/schema";

export const GET = withErrorHandling("vocabulary", async () => {
  const { user } = await requireApiSession();
  return Response.json(await listVocabularyItemsForUser(user.id));
});

export const POST = withErrorHandling("vocabulary", async (req) => {
  const { user } = await requireApiSession();
  const input = VocabularyInputSchema.parse(await req.json());
  const item = await storeVocabularyItemForUser(user.id, input);
  return Response.json(item, { status: 201 });
});
```

This is the only code change required. The list query's `queryFn` already
points at `GET /api/vocabulary` and the schema (`VocabularyListResponseSchema`)
already matches the array shape returned by `listVocabularyItemsForUser`.

### Why this fixes both bugs

- **405 disappears.** The list query refetch now hits a real handler.
- **Create refreshes the UI.** The mutation's `onSuccess` invalidates
  `vocabularyQueries.all()` (prefix `["vocabulary"]`), which Tanstack matches
  against both `["vocabulary", "list"]` and `["vocabulary", "stats"]`. The
  list query refetches successfully and re-hydrates `listQuery.data`, so
  `filteredItems` shows the new row on the next render.

No changes needed in `mutations.ts`, `queries.ts`, the page, or the
form dialog — the existing pattern already assumed the GET route existed.

## Files to modify

- `src/app/api/vocabulary/route.ts` — add `GET` export that delegates to
  `listVocabularyItemsForUser`.

## Files reused (no changes)

- `listVocabularyItemsForUser` — `src/features/vocabulary/server/services/vocabulary-crud.ts:40`
- `VocabularyListResponseSchema` — `src/features/vocabulary/schema.ts:28`
- `vocabularyQueries.list()` — `src/features/vocabulary/api/queries.ts:11`
- `withErrorHandling` and `requireApiSession` — already in use by the
  sibling routes.

## Verification

Run from `english-reading-training-app`:

```bash
pnpm typecheck
pnpm lint
pnpm knip
```

Then exercise the failing flow in the browser:

1. Open `/vocabulary` and confirm the list renders (now driven by the working
   `GET` handler on first mount, not just the RSC prefetch).
2. Refresh the page once — should still render, no 405 in the network tab.
3. Click "Thêm từ", submit a new word — the row should appear in the table
   without a reload, and the "Tổng" / "Mới" stat cards should bump by 1.
4. Click "Sửa" on any row, change the term, save — the updated term should
   appear in the row; no errors in the console.
5. Click "Xóa" and confirm the row disappears and stats update.

In the browser devtools network tab, confirm:

- `GET /api/vocabulary` returns `200`.
- `POST /api/vocabulary` returns `201`.
- `PATCH /api/vocabulary/[id]` returns `200`.
- `DELETE /api/vocabulary/[id]` returns `204`.
- `GET /api/vocabulary/stats` returns `200`.

No `405` anywhere.

## Risk

Minimal. The list endpoint already has a working service function and a
matching response schema. The RSC prefetch means the page never depended on
client-side `GET` working today, so this is a pure additive change to the
route handler.