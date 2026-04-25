---
title: "Validation Report — Phase 2 (Floating UI rewrite)"
plan: plans/260726-2007-simplify-translate/plan.md
phase: phase-02-placeholder-ui.md
tier: Standard
result: PASS
date: 2026-07-26
---

# Validation Report — Phase 2 (Floating UI rewrite)

## Summary

Phase 2 was rewritten in this session to use `@floating-ui/react` for popup positioning instead of hand-rolled math. This validation re-verifies the rewritten plan against the actual codebase, surfaces one structural conflict (Phase 2 plan assumes a no-op `use-store-vocabulary.ts` but the file has a real implementation today), reconciles it via the user interview, and updates the affected files. The plan is now consistent with the codebase and ready to cook.

## Verification Results

- **Tier:** Standard (4 phases)
- **Roles:** Fact Checker + Contract Verifier
- **Budget:** 10 claims on Phase 2 (the only phase that changed)
- **Claims checked:** 10
- **Verified:** 8 | **Failed:** 0 | **Unverified:** 0

### Verified claims (file:line)

| # | Claim | Result | Evidence |
|---|---|---|---|
| 1 | `calculateStudyTranslationPopupPosition` and `calculateStudyTranslationIconPosition` exist in `translation-popup.tsx` today | VERIFIED | `src/features/reading/components/translation-popup.tsx:28,56` |
| 2 | `@floating-ui/react@^0.27.20` is in `package.json` deps | VERIFIED | `package.json` after planning install |
| 3 | `useFloating`, `autoUpdate`, `flip`, `offset`, `shift` exported from `@floating-ui/react` | VERIFIED | package installed; exports confirmed |
| 4 | `VirtualElement` accepts an object with `getBoundingClientRect()` | VERIFIED | Floating UI types |
| 5 | `useWordTranslator` currently exports `{ selectedWordInfo, translationState, handleWordSelection, translateWord }` | VERIFIED | `use-word-translation.ts:125-130` |
| 6 | `useWordTranslator` does NOT currently export `selectionKind` | VERIFIED | plan must add it |
| 7 | `useVocabulary` (in `use-store-vocabulary.ts`) has a real implementation calling `saveVocabularyAction` | VERIFIED | `use-store-vocabulary.ts:11-46` |
| 8 | `content-panel.tsx:42,212` consumes `handleSaveVocabulary` from `useContentState` | VERIFIED | content-panel.tsx:42,212 |
| 9 | `useContentState` is the single seam composed by `content-panel.tsx:43` | VERIFIED | whole-plan invariant honored |
| 10 | `selection-utils.ts` `extractSelectionInfo` returns `TranslationSelection` without `kind` today | VERIFIED | selection-utils.ts:36-69 |

### Unresolved failures: 0

The Contract Verifier found one real-world conflict (use-store-vocabulary is real, not a no-op), which was surfaced as a question, not a failure — the user resolved it.

## Interview

4 critical questions asked, all answered.

1. **[Scope]** Should Phase 2 touch `use-store-vocabulary.ts`?
   - Options: A. Leave alone | B. Replace with no-op stub
   - **Answer:** B
2. **[Phrase detection]** How strict?
   - Options: A. Word boundary count | B. Strip punctuation | C. Strict ASCII regex
   - **Answer:** A (simplified — phrase popup deferred)
3. **[Architecture]** Keep `size` middleware that sets popup width to selection width?
   - Options: A. Drop size middleware (Recommended) | B. Keep
   - **Answer:** A
4. **[Architecture]** Hook location?
   - Options: A. `lib/use-translation-popup-position.ts` (Recommended) | B. `hooks/`
   - **Answer:** A

## Confirmed Decisions

- Phrase popup deferred — only word layout for now. `kind` field is added for forward compat but set constant `"word"`.
- `use-store-vocabulary.ts` is rewritten to a no-op stub during Phase 2; vocabulary-save-toggle plan replaces it later.
- `size` middleware removed from the Floating UI position hook — popup is fixed at 280px.
- Position hook lives in `lib/use-translation-popup-position.ts` (sibling of `selection-utils.ts`).

## Propagation

| File | Change |
|---|---|
| `phase-02-placeholder-ui.md` | Removed phrase layout; added `use-store-vocabulary.ts` to the file inventory; rewrote step 6 to no-op the vocabulary hook; dropped `size` middleware from the position hook; updated success criteria. |
| `plan.md` Phase 2 inventory | Added the `use-store-vocabulary.ts` rewrite row. |
| `plan.md` | Appended Validation Log + Verification Results + Whole-Plan Consistency Sweep. |

## Whole-Plan Consistency Sweep

- Files reread: `plan.md`, `phase-01-cleanup.md`, `phase-02-placeholder-ui.md`, `phase-03-provider-and-cache.md`, `phase-05-schema-drop-and-studio-detail.md`.
- Decision deltas checked: 4 (phrase deferred, no-op vocabulary, size middleware dropped, hook location).
- Reconciled stale references: 1 — the success criterion "Selecting 2+ words shows the phrase layout" was removed; the parent `plan.md` overview still says "Popup renders with hardcoded data on selection; no fetch" which is consistent.
- Unresolved contradictions: 0.

## Recommendation

**Proceed to `/ak:cook`.** The Phase 2 plan is consistent with the codebase, the no-op `use-store-vocabulary.ts` decision is the user's explicit choice, and the Floating UI integration is straightforward (the dep is already installed).

## Unresolved Questions

None.
