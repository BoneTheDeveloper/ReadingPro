---
status: completed
created: 2026-07-12
completed: 2026-07-12
owner: Luc
---

# Remove Dead Dictionary Error-Response Alias

Delete the pointless re-export of `apiErrorResponseSchema` in `dictionary.schema.ts`,
and repoint any real consumer of the error shape to the lib source
(`@/lib/http/api-envelope-schema`).

## Finding (verified this session)

`src/features/dictionary/schemas/dictionary.schema.ts` re-exports the shared error
schema under a feature alias, with zero transformation:

```ts
// L2-4  import
import { apiErrorResponseSchema } from "@/lib/http/api-envelope-schema";
// L100  alias re-export (no change)
export const dictionaryErrorResponseSchema = apiErrorResponseSchema;
// L127-128  type derived from the alias
export type DictionaryErrorResponse = z.infer<typeof dictionaryErrorResponseSchema>;
```

Verification (grep):
- `dictionaryErrorResponseSchema` → referenced **only in-file** (def L100 + infer L128).
- `DictionaryErrorResponse` → **no external importer**.
- **No** other feature re-exports the error schema; **no** consumer imports the error
  shape from a feature file (all correct usage goes straight to `lib/http`).

Conclusion: this is **dead code**, not indirection to redirect. Delete it.
`reading/schemas/translation.schema.ts` uses `makeApiResponseSchema()` (real
composition) — that is NOT this pattern and stays.

## Scope

| File | Change |
|------|--------|
| `src/features/dictionary/schemas/dictionary.schema.ts` | Delete alias (L100), type (L127-128), and now-orphan import (L2-4) |
| Consumers of `dictionaryErrorResponseSchema` / `DictionaryErrorResponse` | **None** — verified no-op |

Forward rule (already the norm — `route-error-handler.ts` does this): anything needing
the error shape imports `apiErrorResponseSchema` / `ApiErrorResponse` **directly** from
`@/lib/http/api-envelope-schema`. Never via a feature re-export.

## Phases

### Phase 1 — delete dead alias
1. Remove `export const dictionaryErrorResponseSchema = apiErrorResponseSchema;` (L100).
2. Remove `export type DictionaryErrorResponse = z.infer<typeof dictionaryErrorResponseSchema>;` (L127-128).
3. Remove the orphaned `import { apiErrorResponseSchema } from "@/lib/http/api-envelope-schema";` (L2-4) — it imports nothing else.

### Phase 2 — repoint real consumers (verified no-op)
- Re-run grep. If any importer of the removed symbols surfaces, repoint it to
  `apiErrorResponseSchema` / `ApiErrorResponse` from `@/lib/http/api-envelope-schema`.
- Current state: zero consumers → nothing to change. Kept as an explicit guard step.

### Phase 3 — verify
- `pnpm typecheck` && `pnpm lint` clean.
- Grep guard: `grep -rn "dictionaryErrorResponseSchema\|DictionaryErrorResponse" src/` → empty.

## Success criteria

- No feature re-export of `apiErrorResponseSchema`.
- `dictionary.schema.ts` no longer imports from `@/lib/http/api-envelope-schema` (unless a
  real, transforming use is later added).
- `pnpm typecheck` + `pnpm lint` pass; no dangling references.

## Risks

- **Very low.** Pure dead-code removal; typecheck catches any missed reference.
- Do not touch `reading`'s `makeApiResponseSchema(...)` usage — legitimate composition.

## Out of scope

- The 6 `<x>ResponseSchema = <x>DataSchema` bare-data aliases (envelope-vs-data-plain
  design question) — separate decision, tracked elsewhere.
- The schema input-naming rename — see
  `plans/20260712-1150-schema-input-naming-convention/plan.md`.
