# Vocabulary mutations: TanStack Query + working delete + filtered status

## Context

The vocabulary page is currently a hybrid that violates the project conventions in `CLAUDE.md`:

- Page is `dynamic = "force-dynamic"`, server prefetches a list, then hands it to a client component as `initialList`/`initialStats` props (line 5 + lines 13-17 of `vocabulary/page.tsx`).
- `VocabularyPageClient` mutates with `setState` only — `handleDelete` at `vocabulary-page.tsx:101-104` updates local state and never talks to the server. The "Xóa" button in the row (`vocabulary-list.tsx:285-295`) calls this fake handler.
- Status filter chips at `vocabulary-list.tsx:84-99` look interactive, but no filtering happens — `items` is passed through unchanged.
- Stat cards at `vocabulary-page.tsx:135-158` always show the initial server-fetched numbers and never update.
- `initialStats={{ total: 0, new: 0, learning: 0, known: 0 }}` is hardcoded to zeros on every page load (page.tsx:15), so the cards literally always render 0 until something else populates them — which nothing does.
- The delete button visibility depends on `hovered` state (`vocabulary-list.tsx:255-258`, `opacity: hovered ? 1 : 0`), which means on touch devices it's invisible.

The official pattern is in `app/(dashboard)/study/page.tsx`: server prefetches into TanStack Query cache via `HydrationBoundary`, and the client uses `queryOptions` factories with typed cache invalidation. CLAUDE.md mandates `api/queries.ts` + `useMutation` for writes.

The user asked for two things; both require fixing the foundation. So this is one plan, not two.

## Decisions (confirmed with user)

1. Convert vocabulary page to **TanStack Query + HydrationBoundary** (Pattern B, matches `study/page.tsx`).
2. Mutations invalidate `vocabularyQueries.all()` on success → server becomes source of truth on every change.
3. Status filter chips actually filter the rendered rows.
4. Stat cards derive from the current cached list — single source of truth. **Stats = global rollup** (not affected by filter).
5. **No tick icon.** The row's "right of delete" affordance stays a real `Trash` icon (lucide-react) — the existing inline SVG at `vocabulary-list.tsx:289-296` is an X shape, not a trash shape; user flagged it as the bug to fix.

## Files to create / modify

### A. `src/features/vocabulary/server/services/vocabulary-crud.ts`
Two additions (mutations per CLAUDE.md: services throw `AppError`):
- `deleteVocabularyItemForUser(userId, id)` — `prisma.vocabularyItem.delete({ where: { id, userId } })`. Throws `AppError(NOT_FOUND)` if miss.
- `listVocabularyStatsForUser(userId)` — single `groupBy` on `learningstatus` returning `{ total, new, learning, known }`. Avoids the `initialStats={0,0,0,0}` hack.

### B. `src/app/api/vocabulary/[id]/route.ts` (new file)
Per CLAUDE.md HTTP map: `DELETE [id]` → `delete*Entity`. Same shape as the existing `POST /api/vocabulary`:
```ts
export const DELETE = withErrorHandling("vocabulary", async (_req, ctx) => {
  const { user } = await requireApiSession();
  const { id } = ctx.params; // use your existing param shape
  await deleteVocabularyItemForUser(user.id, id);
  return new Response(null, { status: 204 });
});
```

### C. `src/features/vocabulary/api/mutations.ts`
Add a third hook:
```ts
export function useDeleteVocabularyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["vocabulary", "delete"] as const,
    mutationFn: (id: string) =>
      fetchJson(`/api/vocabulary/${id}`, z.void(), { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vocabularyQueries.all() }),
  });
}
```
A `useUpdateVocabularyStatusMutation` is in scope too — the row's status toggle (`vocabulary-list.tsx:262-265`) currently calls a `// TODO` no-op at `vocabulary-page.tsx:94-99`. Same shape: `PATCH /api/vocabulary/[id]` with `{ learningstatus }`, invalidate on success. This was implicit in the user's "make it work right" ask and prevents leaving a known broken handler behind.

### D. `src/features/vocabulary/schema.ts`
Add to the existing schema:
- `VocabularyUpdateInputSchema = z.object({ learningstatus: z.nativeEnum(VocabularyStatus) })`.
- `vocabularyIdParamSchema = z.object({ id: z.string().uuid() })`.

### E. `src/app/api/vocabulary/[id]/route.ts`
Add `PATCH` alongside `DELETE` for the status toggle:
```ts
export const PATCH = withErrorHandling("vocabulary", async (req, ctx) => {
  const { user } = await requireApiSession();
  const { id } = vocabularyIdParamSchema.parse(ctx.params);
  const input = VocabularyUpdateInputSchema.parse(await req.json());
  const updated = await updateVocabularyStatusForUser(user.id, id, input);
  return Response.json(updated);
});
```

### F. `src/features/vocabulary/server/services/vocabulary-crud.ts` (cont.)
- `updateVocabularyStatusForUser(userId, id, { learningstatus })` — `prisma.vocabularyItem.update` returning the full item mapped to `VocabularyItem`.

### G. `src/app/(dashboard)/vocabulary/page.tsx`
Switch to Pattern B:
```ts
export default async function VocabularyPage() {
  const { user } = await requirePageSession();
  const qc = getQueryClient();

  // Server-side prefetch so the first paint is hydrated, not empty.
  await Promise.all([
    qc.prefetchQuery({
      ...vocabularyQueries.list(),
      queryFn: ({ signal }) => listVocabularyItemsForUser(user.id, { signal }),
    }),
    qc.fetchQuery({
      ...vocabularyQueries.stats(),
      queryFn: () => listVocabularyStatsForUser(user.id),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <VocabularyPageClient />
    </HydrationBoundary>
  );
}
```
Note: `listVocabularyItemsForUser` will need a `{ signal }` overload — add `{ signal }?: AbortController['signal'] }` typing and `prisma.$*` will ignore it; if Prisma doesn't honor a signal in this project, drop it and call without. (Verify in the existing study-workspace wiring — precedent exists.)

### H. `src/features/vocabulary/api/queries.ts` (new file)
```ts
import { queryOptions } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/fetch-json";
import { vocabularyListSchema, vocabularyStatsSchema } from "@/features/vocabulary/schema";

export const vocabularyQueries = {
  all: () => ["vocabulary"] as const,
  list: () =>
    queryOptions({
      queryKey: [...vocabularyQueries.all(), "list"] as const,
      queryFn: ({ signal }) => fetchJson("/api/vocabulary", vocabularyListSchema, { signal }),
    }),
  stats: () =>
    queryOptions({
      queryKey: [...vocabularyQueries.all(), "stats"] as const,
      queryFn: ({ signal }) => fetchJson("/api/vocabulary/stats", vocabularyStatsSchema, { signal }),
    }),
};
```

Per CLAUDE.md: no `"use client"`, no `query-keys.ts`, queryKeys live inside factories. `api/queries.ts` carries no React import. (The new file may need a `"use client"` only if using client-only TanStack Query APIs — but `queryOptions` factories are plain objects.)

### I. `src/app/api/vocabulary/stats/route.ts` (new file)
Per CLAUDE.md the route belongs to the feature that owns the contract (vocabulary). Returns the stats DTO:
```ts
export const GET = withErrorHandling("vocabulary", async () => {
  const { user } = await requireApiSession();
  return Response.json(await listVocabularyStatsForUser(user.id));
});
```

### J. `src/app/api/vocabulary/route.ts` (existing)
The GET currently returns a flat array. Per CLAUDE.md convention, list + stats are separate queries; the existing route stays as-is and a new GET handler can be added if needed. (Don't break the existing shape; new file `stats/route.ts` is sufficient.)

### K. `src/features/vocabulary/schema.ts` (cont.)
Export a `VocabularyStatsSchema`:
```ts
export const VocabularyStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  new: z.number().int().nonnegative(),
  learning: z.number().int().nonnegative(),
  known: z.number().int().nonnegative(),
});
export type VocabularyStats = z.infer<typeof VocabularyStatsSchema>;
```
Add `VocabularyListResponseSchema = VocabularyItemSchema.array()` so the GET list endpoint has a typed response. (Optional polish — the client uses `VocabularyItem[]` from the prop, so this is mostly for the new query factory.)

### L. `src/features/vocabulary/component/vocabulary-page.tsx`
Strip out everything that becomes derived state:
- Drop `initialList`, `initialTotal`, `initialStats`, `initialSets` props.
- Use `useQuery(vocabularyQueries.list())` for items + `useQuery(vocabularyQueries.stats())` for stat cards.
- Stat cards: 4 hardcoded `StatCard` calls → map over `{ total, new, learning, known }` keys with localized labels in a single config array. The cards now reflect server truth and update automatically when items change (mutation invalidates stats).
- Filter actually filters: `const filteredItems = useMemo(() => statusFilter === "ALL" ? items : items.filter(i => i.learningstatus === statusFilter), [items, statusFilter])` → pass `filteredItems` to `<VocabularyList>`.
- Wire mutations:
  ```ts
  const updateStatus = useUpdateVocabularyStatusMutation();
  const deleteItem  = useDeleteVocabularyMutation();
  const handleStatusChange = (id, s) => updateStatus.mutate({ id, learningstatus: s });
  const handleDelete       = (id)       => deleteItem.mutate(id);
  ```
- Loading states: `loading={listQuery.isPending}` on `<VocabularyList>`. Skeleton already exists in the list component.
- Sets: not in scope this change. Leave `initialSets={[]}` or accept as props for now; sets CRUD is its own TODO.

### M. `src/features/vocabulary/component/vocabulary-list.tsx`
UX fixes — small, scoped, all in one file:
- Replace `useState(hovered)` opacity gates with **always-visible** action buttons. On mobile/touch the existing pattern hides them entirely; that's a real bug. Keep a single CSS opacity transition (`opacity-0 group-hover:opacity-100`, `md:opacity-100 md:group-hover:opacity-100`) so hover behavior still feels intentional on desktop but mobile users can always tap.
- Hit area: the action buttons (`vocabulary-list.tsx:260-295`) are `size-7` (28px) — below the 44px touch minimum. Wrap them in a `flex` container with `gap-2` and either add `before:` hitSlop pseudo-elements (matching the popup's pattern at `inline-translation-popup.tsx:133`) or grow to `size-9` (36px, still tight) with `mr-[-6px]` to compensate. **Pick: `size-9` + container `pr-2`.**
- Tick icon on the right of the delete button: **dropped per user decision.** No tick, no success flash, no extra props.
- Replace the existing "X" SVG with a real `Trash` icon from `lucide-react` (`size-3.5` to match the surrounding `size-7` button + 2px stroke). The current two crossed-lines SVG at `vocabulary-list.tsx:289-296` visually reads as "close" — that's a UX bug regardless of the wiring.

## Files explicitly NOT touched
- `prisma/schema.prisma` — model already has all needed fields.
- `src/features/vocabulary/api/mutations.ts` (create) — already exists.
- `src/features/vocabulary/server/services/vocabulary-crud.ts` (list) — signature widens, body unchanged for list.
- Vocabulary sets / `vocabulary-set-list.tsx` — separate TODOs.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm knip
```

End-to-end (manual):
1. Open /vocabulary — stat cards show real counts (`listVocabularyStatsForUser`).
2. Click "Mới" filter chip — only `learningstatus === "NEW"` rows render. Card counts unchanged (they're a global rollup, not a filtered subset).
3. Click "Đã thuộc" pill on a row — row visibly updates (NEW → MEMORIZED), stats cards refresh, list re-evaluates the filter.
4. Click the trash icon on a row — row disappears, `total` decrements, `new`/`learning`/`known` decrements in the matching bucket.
5. Tap the trash icon on a mobile-sized viewport — visible without hover (touch bug fixed). The icon renders as a real `Trash` glyph, clearly distinct from the "Đóng" X icon used in the reading popup.

## Risk
Low. The migration touches many files but they're all small and the failure mode is "page shows nothing on first load" rather than data loss (server prefetch happens before render). The most invasive change is the prop → TanStack Query migration in `vocabulary-page.tsx`; the rest are additive. Existing `useCreateVocabularyMutation` already invalidates `["vocabulary", "create"]` — needs an upgrade to also invalidate `vocabularyQueries.all()` so the new vocab appears in the list. **Add that as a one-line fix in scope.**

## Out of scope
- Pagination beyond what's already there (server-side `take`/`skip` — `page` state is plumbed but the server ignores `page`).
- Sets CRUD.
- Undo for delete (toast with "Hoàn tác" — separate plan).
- Search debouncing on the input.
- Confirmation dialog for delete (per Material Design destructive-emphasis: a delete this consequential should confirm; flagged for a follow-up — current ask was "implement to real work", not "make it bulletproof").