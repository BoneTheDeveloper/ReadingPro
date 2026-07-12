---
status: completed
created: 2026-07-12
completed: 2026-07-12
owner: Luc
---

# Error Hygiene — Remove Dead/Redundant Error Indirection

Three verified error cleanups. All behavior-preserving. `toHttp` maps domain errors to
HTTP by `instanceof`; anything not in that set → 500. Audit found one dead re-export, one
never-thrown class, and one redundant wrapper that is semantically a `NotFoundError`.

## Findings (verified this session)

| # | Target | State | Fix |
|---|--------|-------|-----|
| 1 | `src/lib/http/route-error-handler.ts:14` `export { NotFoundError } from "@/lib/errors"` | Dead re-export — no file imports `NotFoundError` from this module (all 6 consumers import from `@/lib/errors`). Internal `instanceof` use comes from the top import block (L7), unaffected. | Delete L14 |
| 2 | `src/features/ai-chat/errors/chat-service.error.ts` `StudyChatServiceError` | Never thrown, never `instanceof`-checked — 0 references outside its own file. No barrel in `errors/`. | Delete the file (dir becomes empty) |
| 3 | `src/features/vocabulary/services/vocabulary-items.service.ts:23` `VocabularyServiceError` | Wrapper over plain `Error`; thrown once for a not-found source. Message `"Source not found."` is byte-identical to `new NotFoundError("Source")`. Extends `Error` → would be 500 if ever routed; `NotFoundError` → correct 404. | Replace throw with `NotFoundError("Source")`, delete the class, add the import |

## Non-negotiable constraints

- **Behavior-preserving.** Client-visible error messages unchanged (#3 message is identical).
- No public contract change: none of the three symbols are imported outside their file
  (verified by grep).

## Phases

### Phase 1 — delete dead re-export (#1)
- Remove line 14 of `route-error-handler.ts`. Keep the L7 import block (used by `toHttp`).

### Phase 2 — delete never-thrown error class (#2)
- Delete `src/features/ai-chat/errors/chat-service.error.ts`.

### Phase 3 — replace redundant wrapper (#3)
1. `vocabulary-items.service.ts`: add `import { NotFoundError } from "@/lib/errors";`.
2. Replace `throw new VocabularyServiceError("Source not found.")` →
   `throw new NotFoundError("Source")`.
3. Delete the `VocabularyServiceError` class declaration.

### Phase 4 — doc guidance
- `docs/code-standards.md` Errors section: add one line — only subclass an error when it
  adds a specific message OR a field the caller consumes (e.g. `code`); a subclass or
  re-export that only renames a base error is redundant — throw/import the base directly.

### Phase 5 — verify
- `pnpm typecheck` && `pnpm lint` clean.
- Grep guard: `StudyChatServiceError`, `VocabularyServiceError` → zero hits repo-wide.

## Success criteria

- No dead error re-export in `lib/http/`.
- No never-thrown error class.
- No error subclass that only renames a base with no added message/field.
- `pnpm typecheck` + `pnpm lint` pass; client error messages unchanged.

## Risks

- **Very low.** All three symbols have zero external importers; typecheck catches any miss.
- `PassageStudyServiceError` (carries a consumed `code`) and `ArtifactNotFoundError`
  (adds a specific message, extends `NotFoundError`) are **kept** — they earn their place.

## Out of scope

- The upload `Request`→`Input` suffix mismatch and `getUploadStatus` validation gap
  (tracked in the schema-input-naming plan's execution notes).
