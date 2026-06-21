---
phase: 1
title: "Response Contract DTO"
status: pending
priority: P1
effort: "1.5h"
dependencies: []
---

# Phase 1: Response Contract DTO

## Overview

Make `POST /api/vocabulary` return the stable `vocabularyDataSchema` DTO instead of the
raw Prisma row. This fixes the silent-save bug **and closes a data-exposure leak**: the
route today returns the entire Prisma record (`userId`, `status`, `savedCount`,
`normalizedText`, dictionary FKs, …), and the client parses with a `.strict()` schema
that rejects those extra fields, so `safeParse` fails and the save looks broken.

## Requirements

- **Functional:** Response conforms exactly to `vocabularyDataSchema`
  (`{ id, displayText, translation, type, createdAt, updatedAt }`),
  `createdAt`/`updatedAt` as ISO strings. No internal fields leaked.
- **Non-functional:** Persistence behavior unchanged; mapping is a pure boundary
  transform. Error envelopes and status codes unchanged.
- **Security:** This is a data-exposure fix, not cosmetic — internal/user-scoped fields
  stop being returned in the response body.

## Architecture

`saveVocabularyItem` keeps returning the domain `VocabularyItem`. Add a small mapper
(`toVocabularyDTO`) used only by the route before `NextResponse.json`. Keeps the domain
service free of HTTP-contract concerns (server-boundary invariant).

```ts
// in src/app/api/vocabulary/route.ts
function toVocabularyDTO(item: VocabularyItem) {
  return {
    id: item.id,
    displayText: item.displayText,
    translation: item.translation,
    type: item.type,                              // non-null in DB; no `?? null`
    createdAt: new Date(item.createdAt).toISOString(), // coerce Date-or-string safely
    updatedAt: new Date(item.updatedAt).toISOString(),
  };
}
// return NextResponse.json({ success: true, data: toVocabularyDTO(item) });
```

Notes from red-team review:
- **M2:** `new Date(item.createdAt).toISOString()` (not `item.createdAt.toISOString()`) —
  the latter throws on a string date (tests / any serialized input) → 500.
- **M5:** `type` is `String @default("WORD")` (non-null) in the schema, so drop the dead
  `?? null`. DTO keeps `type: string | null` for forward-compatibility.
- **M4:** before clamping, grep consumers of the POST `/api/vocabulary` response for any
  field outside the 6 DTO keys (client reads only `parsed.data.data.id` —
  `study-workspace-client.tsx:254` — so likely safe; verify).

## Related Code Files

- Modify: `src/app/api/vocabulary/route.ts` (add mapper, wrap response)
- Read for contract: `src/contracts/translation/translation-response-schema.ts`
- Test: `tests/vitest/integration/api/vocabulary-save-route.test.ts`

## Implementation Steps (TDD)

1. **Consumer check (M4):** grep callers of the POST response across `src/` and tests;
   confirm nothing reads a non-DTO field. Record the result in the phase.
2. **RED (unit, real mapping):** add a direct unit test for `toVocabularyDTO` that feeds a
   **full Prisma-shaped object** (with `userId`/`status`/`savedCount` and `Date`
   `createdAt`/`updatedAt`) and asserts the output has exactly the 6 DTO keys with ISO
   strings. This is the meaningful guard — the route integration test mocks the service,
   so a route-level strict-parse assertion alone does **not** exercise the real leak.
3. **RED (route contract):** in `vocabulary-save-route.test.ts`, assert the success
   response parses `vocabularyResponseSchema` and `data` has exactly the 6 keys. (Uses
   the mocked service; make the mock return a full-row fixture so the mapper is exercised.)
4. **GREEN:** add `toVocabularyDTO` and map before responding.
5. `pnpm run typecheck` + save-route test → green.

## Success Criteria

- [ ] Consumer check done; no non-DTO field consumed (or callers updated).
- [ ] Direct `toVocabularyDTO` unit test (full-row input) green.
- [ ] Route response parses `vocabularyResponseSchema`; `data` has exactly 6 keys.
- [ ] No internal Prisma fields in `data`; dates are ISO strings.
- [ ] `pnpm run typecheck` clean; save-route test green.

## Risk Assessment

- **Data-exposure fix (Medium), not cosmetic.** Main pitfall: a consumer silently
  relying on a now-removed field — mitigated by the M4 consumer grep. Date coercion
  (M2) prevents the 500-on-string-date footgun.
