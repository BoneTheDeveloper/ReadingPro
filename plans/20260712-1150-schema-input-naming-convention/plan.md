---
status: completed
created: 2026-07-12
completed: 2026-07-12
owner: Luc
---

# Schema Input Naming Convention — Rename & Relocate

Normalize server-action input schemas to the `Input` suffix and move them out of
`"use server"` action files into each feature's `*.schema.ts`, per the updated
`docs/code-standards.md` Schema Conventions (Rule #4, #6).

## Decisions (locked)

- **Suffix:** server-action args = `<verb><Entity>InputSchema`; HTTP route body stays `<entity>RequestSchema`.
- **Placement:** input schemas live in `features/<f>/schemas/<f>.schema.ts` (exported), imported by `actions.ts`. Never inline in a `"use server"` file.
- **Doc:** already updated (`docs/code-standards.md`, this session). `Input` un-banned; `Request` vs `Input` split by transport.

## Scope

| Feature | Current inline schemas | Action needed |
|---------|------------------------|---------------|
| dictionary | `suggestInputSchema`, `entryDetailInputSchema` | already `Input`-suffixed → **relocate only** |
| vocabulary | 8: `saveVocabularySchema`, `updateStatusSchema`, `reviewSchema`, `createSetSchema`, `updateSetSchema`, `deleteSetSchema`, `addItemsToSetSchema`, `removeItemFromSetSchema` | **rename + relocate** |
| studio-panel | `passageIdSchema`, `recordQuizResultSchema`, `generateStudioQuestionsSchema` | **rename + relocate** |
| learning-session | none | **audit** — verify input is validated somewhere |
| upload | none inline | **audit** — routes validate via `uploadFileRequestSchema` etc.; confirm actions covered |

All target schemas are **private `const` (not exported)** → relocation is low-risk; `pnpm typecheck` catches every dangling reference.

## Rename map (vocabulary)

```
saveVocabularySchema        → saveVocabularyInputSchema
updateStatusSchema          → updateVocabularyStatusInputSchema
reviewSchema                → reviewVocabularyInputSchema
createSetSchema             → createVocabularySetInputSchema
updateSetSchema             → updateVocabularySetInputSchema
deleteSetSchema             → deleteVocabularySetInputSchema
addItemsToSetSchema         → addItemsToVocabularySetInputSchema
removeItemFromSetSchema     → removeItemFromVocabularySetInputSchema
```

## Rename map (studio-panel)

```
recordQuizResultSchema       → recordQuizResultInputSchema
generateStudioQuestionsSchema→ generateStudioQuestionsInputSchema
passageIdSchema              → keep (bare uuid validator, not an entity input) — leave inline or move as-is
```

## Phases

### Phase 1 — docs (DONE this session)
- `docs/code-standards.md` Schema Conventions updated (Rule #4, #6 + Roles table). ✅

### Phase 2 — dictionary (relocate only)
1. Move `suggestInputSchema`, `entryDetailInputSchema` from `dictionary/actions.ts` → `dictionary/schemas/dictionary.schema.ts` (add `export`).
2. Import them back into `actions.ts`.
3. `pnpm typecheck`.

### Phase 3 — vocabulary (rename + relocate)
1. Move the 8 schemas to `vocabulary/schemas/vocabulary.schema.ts` with the rename map above (`export`).
2. Update `actions.ts` imports + the `z.infer<typeof ...>` param types.
3. Confirm `actions.ts` back under 200 lines.
4. `pnpm typecheck`.

### Phase 4 — studio-panel (rename + relocate)
1. Move `recordQuizResultInputSchema`, `generateStudioQuestionsInputSchema` to `studio-panel/schemas/question.schema.ts` (or the closest existing schema file).
2. Update `actions.ts`.
3. `pnpm typecheck`.

### Phase 5 — audit missing validation (security)
- `learning-session/actions.ts`, `upload/actions.ts`: confirm every exported action validates its args with an `InputSchema` before use. Server actions are public endpoints → unvalidated args = injection surface. Add schemas where missing.

### Phase 6 — verify
- `pnpm typecheck` && `pnpm lint` clean.
- Grep guard: no `const \w+Schema` left in any `actions.ts`.

## Success criteria

- No input schema declared inline in a `"use server"` file.
- Every server-action arg validated by a `<verb><Entity>InputSchema` from `schemas/`.
- `pnpm typecheck` + `pnpm lint` pass.
- `actions.ts` files under 200 lines.

## Risks

- **Low.** All targets are private consts; typecheck surfaces any missed reference immediately.
- `passageIdSchema` is a bare validator, not an entity input — do not force an `Input` suffix on it.
- Phase 5 may reveal a real validation gap (not just naming) — treat separately if found.

## Out of scope

- Route `*RequestSchema` (already compliant).
- DTO / response / data schemas (already compliant).
- Any behavior change — this is rename + relocation only.

## Execution notes (2026-07-12)

All 6 phases done. `pnpm typecheck` + `pnpm lint` clean. Grep guard: zero entity
input schemas left inline in any `actions.ts`; `passageIdSchema` (studio-panel)
intentionally kept inline per this plan's own exception (bare UUID validator, not
an entity input). All `actions.ts` files under 200 lines.

**Phase 5 audit — 2 findings surfaced, deliberately NOT auto-fixed (both fall outside
this plan's locked scope — rename/relocate only, no behavior change, no unplanned
renames):**

1. `upload/schemas/upload.schema.ts`: `uploadFileRequestSchema` / `uploadTextRequestSchema`
   are consumed only by `upload/actions.ts` (no `route.ts` exists for upload) — under the
   new convention these should be `Input`-suffixed, not `Request`. Renaming touches two
   exported types (`UploadFileRequest`, `UploadTextRequest`) not covered by this plan's
   locked rename maps.
2. `upload/actions.ts` `getUploadStatus(jobId: string)` has zero schema validation on
   `jobId` before it hits Prisma. Not SQL-injectable (Prisma parameterizes), but adding
   validation would change the error path (ZodError vs. today's "Job not found"), which
   is a behavior change this plan explicitly excludes.

`learning-session/actions.ts` audited clean — its one action takes no arguments.
