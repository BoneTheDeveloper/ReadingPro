---
phase: 3
title: "Integration & Regression Coverage"
status: pending
priority: P2
effort: "1.5h"
dependencies: [2]
---

# Phase 3: Integration & Regression Coverage

## Overview

Lock the contract + error behavior with the mock-based integration suite, confirm
telemetry safety, and document the client saved-state limitation for the deferred UI
round. Dedup behavior itself is verified in Phase 2 (pure unit test + manual dev-DB
checklist) — **not** re-asserted here, because the integration suite mocks Prisma and
cannot observe real upsert/savedCount/occurrence behavior.

## Requirements

- **Functional:** Contract regression + validation/auth/ownership cases pass and fail if
  the DTO mapping regresses. Telemetry carries no raw text.
- **Non-functional:** Runs in the existing mock-based vitest setup — no new test infra.

## Architecture

Extend the existing contract suite (`vocabulary-save-route.test.ts`,
`translation-vocabulary-routes.test.ts`). These mock the service/queries, so they verify
the route's request validation, response envelope/DTO shape, auth, and ownership — not
the dedup persistence (that's Phase 2's domain).

## Related Code Files

- Modify: `tests/vitest/integration/api/vocabulary-save-route.test.ts`
- Modify: `tests/vitest/integration/api/translation-vocabulary-routes.test.ts`
- Update: `docs/API/Routes/response-contract-coverage.md` (Phase 2 Contract Test Map row)
- Update: `plans/.../brainstorm-summary.md` + this plan (M3 limitation note)

## Implementation Steps (TDD)

1. **Contract regression** — assert `POST /api/vocabulary` success parses
   `vocabularyResponseSchema` and `data` has exactly the 6 DTO keys (fails if the route
   reverts to the raw Prisma row).
2. **Validation/auth/ownership** — invalid payload → 400; unauthenticated → 401;
   `source="TRANSLATE"` with unowned `sourceId` → 404. Confirm existing cases still hold.
   **Note (from red-team):** the `DICTIONARY` path does **not** validate
   `dictionaryEntryId`/`dictionarySenseId` ownership — out of scope here; do not let
   "ownership covered" imply the dictionary FKs are checked.
3. **Telemetry safety** — assert the server logger/Sentry spy receives only `sourceId` +
   length fields, never raw `selectedText`/`context`. Spy on the server logger mock
   (`tests/vitest/mocks/logger`) at the route/service layer — client breadcrumbs are a
   component concern, not this suite.
4. `pnpm run typecheck && pnpm run lint && pnpm run test` → green.
5. Update the contract-coverage test map row for the vocabulary save route.

## Known Limitation — Client Saved-State (for the UI round)

> **M3 (deferred, document-only):** the client tracks saved state in `savedVocabularyIds`
> keyed on `buildTranslationSelectionKey(selection)` — a JSON of
> `{sourceId, selectedText, contextSentence, targetLanguage}`
> (`study-workspace-client.tsx:247-249,468-475`). This diverges from the **server**
> dedup key (`userId + normalizedText + targetLanguage + normalizedTranslation`): the
> same word+meaning saved from a *different passage/sentence* is one item server-side
> (+1 occurrence) but shows as **un-saved** in the client because the selection key
> differs. The server fix makes the save *succeed*; this divergence only affects the
> *Saved badge* for cross-context saves.
>
> **To implement in the UI round:** key client saved-state on the returned
> `parsed.data.data.id` (available after Phase 1) instead of the selection JSON.
> Tracked here so it is not lost.

## Success Criteria

- [ ] Contract regression test green; fails if route reverts to raw Prisma.
- [ ] Validation/auth/ownership cases pass.
- [ ] Telemetry test asserts no raw text leaked (server logger spy).
- [ ] `typecheck` + `lint` + full `test` suite green.
- [ ] `response-contract-coverage.md` test map updated.
- [ ] M3 client saved-state limitation documented here + in brainstorm summary.

## Risk Assessment

- **Low risk** — test + docs only. The suite is mock-based, so it cannot (and does not
  claim to) verify dedup persistence; that boundary is stated explicitly to avoid a
  false sense of coverage.
