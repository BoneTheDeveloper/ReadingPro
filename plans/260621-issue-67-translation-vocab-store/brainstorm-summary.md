# Brainstorm Summary — Issue #67: Translation Contract & Vocabulary Save Store Strategy

**Date:** 2026-06-21
**Branch:** `feature/issue-67-translation-contract`
**Issue:** [#67](https://github.com/BoneTheDeveloper/english-reading-training-app/issues/67) — Align inline translation contract and vocabulary save flow
**Method:** Dev-guide-driven (`docs/development-guide.md`) — WHY → WHAT → HOW → CONTRACT → PATH → VERIFY
**Status:** Spec approved; UI work deferred to a later round.

---

## Problem Statement

A learner selects text, translates it, clicks save, and gets **no confirmation** — even
though the row persists. Root cause is a response-contract mismatch; secondarily, the
**store model** must reliably separate "same meaning re-saved" from "different meaning."

### Root cause (verified in code)

- `POST /api/vocabulary` returns the **raw Prisma `VocabularyItem`** (`route.ts` → `{ success, data: item }`).
- The client parses with `vocabularyResponseSchema` → `vocabularyDataSchema`, which is
  `.strict()` and only allows `{ id, displayText, translation, type, createdAt, updatedAt }`.
- Extra Prisma keys → `safeParse` **always fails** → client throws → caught into a Sentry
  breadcrumb → user sees nothing; `savedVocabularyIds` never updates → no Saved state.

This contradicts `docs/API/Routes/response-contract-coverage.md`, which already states
raw Prisma records must be mapped to the documented schema first.

### Already satisfied (narrowed scope)

- Client `/api/translate` payload matches the route's strict schema (AC1). No client-selected mode exists.
- Translate result + error states already render in the popup (AC2/AC4).
- Telemetry logs only `sourceId` + text lengths, never raw text (AC6).

---

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Map Prisma → DTO at the **route boundary** | Keeps the domain service returning the model; contract stays `.strict()`; matches "pure contracts at the server boundary" invariant |
| D2 | **Normalize the translation** in the dedup key | Kills casing/whitespace + provider-noise duplicates; keeps "same vs different meaning" robust |
| D3 | Keep **one item, many occurrences** | Preserves the "seen in" context list; matches existing occurrence model |
| D4 | Save **UI** (popup button, in-flight guard, Saved state) is a **later round** | This round is store-model + contract correctness |

### Store strategy (the core)

Identity key: `userId + normalizedText + targetLanguage + normalizedTranslation`
where `normalizedTranslation = lowercase + collapse-spaces + trim` of the meaning.

| Conflict case | Resolution |
|---------------|------------|
| Same word, same meaning, re-saved | Update in place, `savedCount++` — one row |
| Same word, different meaning | New row (distinct normalized translation) |
| Same word, meaning differs only by case/whitespace | Same row (normalized before keying) |
| Same word + meaning, different passage | One row, +1 occurrence |

**Accepted limitation:** "meaning" is compared on the normalized string, not semantics.
Genuinely different senses that normalize identically will merge (rare). Sense-level
identity (`dictionarySenseId`) is out of scope.

---

## Implementation Outline (for `/ck:plan`)

| Layer | File | Change |
|-------|------|--------|
| Schema | `prisma/schema/vocabulary.prisma` | Add `normalizedTranslation`; switch `@@unique` to `[userId, normalizedText, targetLanguage, normalizedTranslation]` |
| Migration | `prisma/migrations/...` | Add column + backfill normalized values + **merge pre-existing near-duplicates before the unique applies** (else migration fails) |
| Query | `src/server/db/vocabulary-queries.ts` | Normalize translation; key upsert on it; keep raw `translation` as display |
| Route | `src/app/api/vocabulary/route.ts` | Map persisted item → `vocabularyDataSchema` DTO |
| Contract | `src/contracts/translation/translation-response-schema.ts` | No change — it is the target |

**Deferred (next round):** popup Save button, in-flight guard, Saved-state UI in
`translation-popup.tsx` / `study-workspace-client.tsx`.

---

## Docs Authored This Session

- **NEW** `docs/Flows/data-flows/README.md` — per-route flow taxonomy (Happy / Exception / Edge / Race), route-specific, with an ambiguity-resolution rule.
- `docs/Flows/data-flows/vocabulary-flow.md` — rewritten to the taxonomy with the store strategy.
- `docs/Flows/data-flows/translation-flow.md` — rewritten to the taxonomy, route-specific.
- `docs/Requirements/use-cases.md` — UC-10 delta (dedup on normalized translation).
- `docs/Requirements/software-requirements.md` — FR-05b Vocabulary Capture.
- `docs/API/Routes/vocabulary.md` — success response = DTO; dedup key updated.
- `docs/API/Routes/response-contract-coverage.md` — boundary-mapping note.

---

## Verification Targets (Step 7)

- Store: re-save → 1 row, `savedCount=2`; different meaning → 2 rows; `"Chạy"` vs `"chạy"` → 1 row; different passage → +1 occurrence.
- Contract test: `POST /api/vocabulary` response parses against `vocabularyDataSchema`.
- Migration: backfill + duplicate-merge verified.
- Invalid request rejected; telemetry carries no raw text.

## Open Questions

- None blocking. UI behavior (Saved-state copy, "Already saved" affordance) to be
  decided in the deferred UI round.
