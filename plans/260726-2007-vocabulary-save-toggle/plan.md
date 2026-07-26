---
title: "Vocabulary Save Toggle"
description: "Wire the inline translate popup's Save button to a real toggle server action. Upsert on first click; delete on second click. Re-uses the existing translation hook surface — does not touch the translate pipeline."
status: pending
priority: P1
effort: 1d
branch: preview
tags: [refactor, backend, frontend, vocabulary]
blockedBy: []
blocks: []
related: ["260726-2007-simplify-translate"]
created: 2026-07-26
---

# Vocabulary Save Toggle

## Overview

Two phases. Each ends in a fully-committable state where the dev server runs and `pnpm typecheck && pnpm lint && pnpm knip` are green.

| Phase | What | Result |
|---|---|---|
| **1** | [Toggle Action + Hook](./phase-01-toggle-action-and-hook.md) | `toggleVocabularyItemAction` upserts/deletes; `useVocabulary` drives the popup's `Lưu` ↔ `Đã lưu` button. |

This plan only owns the save flow. Translate itself lives in the separate `260726-2007-simplify-translate` plan. The two plans share a hook surface (`useContentState`) but each plan owns its own file rewrites — no double implementation.

## Architectural Decision: Server Action

**Decision: save flow uses a Server Action (`toggleVocabularyItemAction`).**

Rationale:
- Save mutates `VocabularyItem`; the `/vocabulary` page needs `revalidatePath`.
- Existing `saveVocabularyAction` is already a Server Action in `src/features/vocabulary/server/actions/vocabulary.ts` — keep the pattern.
- No second entry point needed.

## Non-Goals

- Translating or fetching translations (owned by simplify-translate plan).
- Studio panel rendering (owned by simplify-translate plan).
- Vocabulary review / SRS scheduler — out of scope.
- Switching to a non-Action RPC for save.

## Goals (this plan)

| # | Goal | Priority |
|---|------|----------|
| 1 | Save flow upserts on `(userId, normalizedText, targetLanguage, normalizedTranslation)`, increments `savedCount`, appends `VocabularyOccurrence` | P1 |
| 2 | Clicking `Đã lưu` removes the headword row and its occurrences (cascade) | P1 |
| 3 | Vocabulary page reflects the change without manual refresh (`revalidatePath`) | P1 |
| 4 | The popup's button text toggles between `Lưu` and `Đã lưu` accurately across selection changes | P1 |
| 5 | `pnpm typecheck && pnpm lint && pnpm knip` green | P1 |

## File Inventory

| Action | Path | Reason |
|---|---|---|
| modify | `src/features/vocabulary/server/actions/vocabulary.ts` | Add `toggleVocabularyItemAction`. Keep `saveVocabularyAction`. |
| rewrite | `src/features/reading/hooks/use-store-vocabulary.ts` | From scratch. Calls `toggleVocabularyItemAction`; tracks saved keys per `(sourceId, selectedText, contextSentence, targetLanguage)`. |

## Cross-plan coordination

- The simplify-translate plan ships a no-op `useVocabulary` stub in its Phase 2 placeholder UI. When this plan lands, it replaces that stub. Cook the simplify-translate plan first (or at least Phase 2 of it); cook this plan second.
- The hook surface `useVocabulary(selection, translationData) → { saved, toggleSave, isVocabularySaved, handleSaveVocabulary }` is the **shared contract**. The simplify-translate plan does not redefine it.

## Success Criteria

- [ ] Click `Lưu` → DB row appears; vocabulary page shows it after revalidate.
- [ ] Click `Đã lưu` → row disappears; vocabulary page reflects the change.
- [ ] Click `Lưu` twice for the same word (two different contexts) → one row with two occurrences.
- [ ] `pnpm typecheck && pnpm lint && pnpm knip` green.

## Risks

- **Save without translation** — if a user clicks `Lưu` while the translation is `null` (not-found), the action must reject. Validate `translation` is non-null in the hook before dispatch.
- **Race** — two rapid clicks could race the toggle. Action uses the unique key for upsert/del, so the second call's intent is honored; but the in-memory `savedKeys` set may flicker. Use a `transitioning` flag to disable the button mid-flight.
- **Order matters** — the simplify-translate plan must have shipped Phase 2 (or this plan imports a stub that the translate plan will eventually replace).

## Open Questions

- Multiple `translation` for the same headword across contexts: should `toggleVocabularyItemAction` upsert based on translation too (current behavior) or be translation-agnostic? Current behavior matches the unique constraint.

<!-- slug: vocabulary-save-toggle -->