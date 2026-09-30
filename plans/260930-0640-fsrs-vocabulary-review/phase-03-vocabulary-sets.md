---
phase: 3
title: "Phase 3: Vocabulary sets"
status: completed
priority: P1
effort: "6h"
dependencies: [1]
---

# Phase 3: Vocabulary sets

## Overview

Deliver US-12 (manual sets) and US-13 (generated set for Pro). A set is a name
plus members. Progress is counted from member statuses at read time.

## Context Links

- [EP-05](../../docs/Requirements/epic-05-memorization-review.md), US-12 and US-13
- Design page, section "Thiết kế set từ vựng"
- `src/server/modules/vocabulary/vocabulary-routes.ts` (route and validation pattern)
- `src/client/features/vocabulary/components/vocabulary-page.tsx` line 82 (`useState<VocabularySet[]>([])`), `vocabulary-set-list.tsx`
- `src/server/modules/auth/auth.ts` (`tier` additional field, default `"FREE"`)

## API

All routes sit behind `requireSession` and are mounted at `/api/vocabulary-set`.

| Method and path | Body | Result |
|---|---|---|
| `GET /` | | `VocabularySet[]` |
| `POST /` | `{ name, itemIds?: uuid[] }` | 201 `VocabularySet` |
| `POST /generate` | `{ name, size: 1..50 }` | 201 `VocabularySet`; 403 when not Pro |
| `GET /:id` | | `VocabularySet` plus `items: VocabularyItem[]` ordered by item `createdAt` |
| `PATCH /:id` | `{ name }` | `VocabularySet` |
| `DELETE /:id` | | 204 |
| `PUT /:id/items` | `{ itemIds: uuid[] }` | 204, adds members, ignores existing |
| `DELETE /:id/items/:itemId` | | 204 |

`VocabularySet` = `{ id, name, createdAt, itemCount, progress: { new, learning, review, relearning } }`.

## Requirements

- [x] Every query filters by the caller's `userId`; item ids that are not the caller's are rejected.
- [x] A duplicate set name for the same user answers 409.
- [x] Generate picks non-NEW words with `dueAt <= now` ordered by `dueAt`, then NEW words ordered by `createdAt`, up to `size`, and creates an ordinary set.
- [x] Generate is refused unless `user.tier === "PRO"`; the button is unavailable to other users.
- [x] The vocabulary page reads sets from the API and shows progress per set.

## Related Code Files

- Create: `src/shared/vocabulary/set-schema.ts`
- Create: `src/server/modules/vocabulary/vocabulary-set-crud.ts`, `vocabulary-set-routes.ts`
- Modify: `src/server/app.ts` (mount), `src/shared/api-error.ts`, `src/client/lib/api/error-message.ts`
- Modify: `src/shared/vocabulary/schema.ts` (remove the old `VocabularySetSchema`)
- Modify: `src/client/features/vocabulary/api/queries.ts`, `api/mutations.ts`
- Modify: `src/client/features/vocabulary/components/vocabulary-page.tsx`, `vocabulary-set-list.tsx`
- Create: `src/client/features/vocabulary/components/vocabulary-set-dialog.tsx`
- Modify: `src/client/routes/vocabulary.tsx` (preload the set list)

## Implementation Steps

1. **Contracts** (`set-schema.ts`): `VocabularySetSchema`, `VocabularySetDetailSchema`,
   `VocabularySetCreateInputSchema` (`name` trimmed, 1..60; `itemIds` max 200),
   `VocabularySetRenameInputSchema`, `VocabularySetGenerateInputSchema`,
   `VocabularySetItemsInputSchema`, and param schemas for `id` and `itemId`.
2. **Error reasons:** `vocabulary_set.not_found` (404), `vocabulary_set.name_taken`
   (409), `plan.pro_required` (403). Add Vietnamese strings to `error-message.ts`.
3. **Service** (`vocabulary-set-crud.ts`):
   - `listVocabularySetsForUser`: load sets, then one
     `groupBy`-style query for member counts per set and status (raw SQL joining
     `VocabularySetItem` to `VocabularyItem`, grouped by set id and status) and
     fold it into `progress` and `itemCount`.
   - `createVocabularySetForUser`: verify `itemIds` belong to the user with a count
     query, create the set with nested `vocabularySetItems.createMany`. Map `P2002`
     to `vocabulary_set.name_taken`.
   - `getVocabularySetForUser`, `renameVocabularySetForUser`,
     `deleteVocabularySetForUser`: `findFirst({ id, userId })` then act, same shape
     as `deleteVocabularyItemForUser`.
   - `addVocabularySetItemsForUser`: ownership check on the set and the items, then
     `createMany({ skipDuplicates: true })`.
   - `removeVocabularySetItemForUser`: ownership check on the set, then
     `deleteMany` on the composite key.
   - `generateVocabularySetForUser(user, input)`: throw `plan.pro_required` when the
     tier is not `"PRO"`; select ids as described in Requirements; call the create
     function. An empty word bank creates an empty set.
4. **Routes** (`vocabulary-set-routes.ts`): register `/generate` before `/:id`.
   Mount in `src/server/app.ts` with `.route("/vocabulary-set", vocabularySetRoutes)`.
5. **Client API:** `vocabularySetQueries` (`all`, `list`, `detail(id)`) and mutations
   for create, generate, rename, delete, add items, remove item. Each invalidates
   `vocabularySetQueries.all()`.
6. **Client UI:**
   - `vocabulary-page.tsx`: replace the `useState([])` with
     `useQuery(vocabularySetQueries.list())`; wire `handleCreateSet` and
     `handleDeleteSet` to the mutations; pass real `loading`.
   - `vocabulary-set-list.tsx`: each card shows `itemCount` and the four progress
     counts; clicking a card opens the set dialog; add the "Tạo bộ từ tự động"
     button, rendered only when the signed-in user's tier is `"PRO"`. It asks for
     a name and a size.
   - `vocabulary-set-dialog.tsx`: rename field, member list with remove, and a
     searchable list of word-bank items not yet in the set with add. This is the
     "group selected words into a named set" step of US-12.
   - Read the tier from the existing auth client session. If the client session
     type lacks `tier`, add better-auth's `inferAdditionalFields` plugin to the
     auth client in `src/client/lib/auth/`.
7. Run the verification commands.

## Todo

- [x] Shared set contracts
- [x] Error reasons and messages
- [x] Set service with ownership checks
- [x] Routes mounted
- [x] Client queries and mutations
- [x] Set list, set dialog, generate button
- [x] Verification passed

## Success Criteria

- `pnpm typecheck && pnpm lint && pnpm build && pnpm exec knip` pass.
- `curl` sequence as a signed-in user: create a set with two item ids (201),
  list shows `itemCount` 2 and `progress.new` 2, rename (200), create another set
  with the first name (201) then rename it to the taken name (409), remove one
  item (204), delete (204), `GET /:id` afterwards (404).
- `POST /` with an item id owned by another user answers 404 and creates nothing.
- `POST /generate` answers 403 with reason `plan.pro_required` for a FREE user.
  After `UPDATE "User" SET tier='PRO'` for the test user and a fresh sign-in, it
  answers 201 and the set contains at most `size` words.
- Deleting a word removes it from its sets (cascade) and the counts drop.
- UI: the "Bộ từ" tab count is real; the generate button is absent for FREE.

## Risk Assessment

- **Session cookie cache.** `tier` is cached in the session cookie for five
  minutes (`cookieCache`), so a tier change needs a new sign-in to be seen.
- **Raw SQL for progress.** Use `Prisma.sql` with bound parameters; table and
  column names are quoted PascalCase and camelCase because the models have no
  `@@map`.
- **Rollback:** revert the commit; no schema change in this phase.

## Security Considerations

The Pro check runs on the server; hiding the button is presentation only. All
set and item ids from the client are checked against the session user before any
write.

## Next Steps

Phase 4 accepts a `setId` to scope a review. Phase 5 adds a review button per set.
