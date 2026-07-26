---
title: "Phase B: Placeholder UI"
phase: b
status: pending
priority: P1
effort: 6h
dependencies: [phase-a-cleanup]
---

# Phase B: Placeholder UI

## Overview

Render the popup with hardcoded data on selection. No fetch. Skeleton appears immediately. Word popup and phrase popup are both fully styled. After this lands, every later phase swaps a placeholder for a real implementation behind the same hook signature.

## Requirements

- Functional
  - Selecting a single English word → popup shows: target word (bold), IPA placeholder `—`, POS placeholder `—`, 1–2 short meanings (mock strings), `Lưu` button (disabled), `Chi tiết` link (disabled).
  - Selecting a phrase → popup shows: translated text block, `Copy` button, `Save phrase` button (disabled).
  - Loading skeleton appears immediately on `mouseup`.
  - Not-found state (test path: select a punctuation-only string) shows "Không tìm thấy bản dịch".
  - The popup keeps its positioning math from the original `translation-popup.tsx`.
- Non-functional
  - Word popup 280px wide; phrase popup 240px wide.
  - `useContentState` returns: `viewMode`, `setViewMode`, `selectedWordInfo`, `translationState`, `selectionKind`, `saved`, `toggleSave`, `isVocabularySaved`, `handleWordSelection`, `translateWord`, `handleSaveVocabulary`.
  - `pnpm typecheck && pnpm lint` green.

## Architecture

The placeholder strategy:
- `useWordTranslator` returns `translationState.data` from a static lookup table keyed by `selectedText.toLowerCase()`. Miss → `data.translation === null`. The hook simulates 200ms latency on first call to exercise the skeleton → success transition.
- `useContentState` composes `useWordTranslator` + `useVocabulary` (Phase B version: `useVocabulary` is a no-op stub returning `{ saved: false, toggleSave: () => {}, isVocabularySaved: false, handleSaveVocabulary: async () => {} }`).
- `translation-popup.tsx` branches on `selectionKind === "word" ? wordLayout : phraseLayout`. Both layouts share positioning.
- `content-panel.tsx` mounts the popup exactly as before; only prop names change.

## Related Code Files

Refer to top-level **File Inventory** in `plan.md`.

This phase owns:
- rewrite: `src/features/reading/schemas/translation.ts`
- modify: `src/features/reading/lib/selection-utils.ts`
- rewrite: `src/features/reading/hooks/use-word-translation.ts`
- rewrite: `src/features/reading/components/translation-popup.tsx`
- rewrite: `src/features/reading/hooks/use-content-state.ts`
- rewrite: `src/features/reading/components/content-panel.tsx`

The five rewrite files form the inline-translate UI chain. **Rewrite each from scratch by reading the original only as a reference.** Copy `calculateStudyTranslationPopupPosition` and `calculateStudyTranslationIconPosition` byte-for-byte from the original `translation-popup.tsx` — do not re-derive.

## Implementation Steps

1. Update `src/features/reading/schemas/translation.ts`:
   ```ts
   export interface TranslationDto {
     translation: string | null;   // null = not found
     type: string | null;          // POS; placeholder for now
     ipa: string | null;           // pronunciation; placeholder for now
     provider: "cache" | "fallback" | "google_translate";
   }
   export interface TranslationSelection {
     selectedText: string;
     selectionRect: { top: number; left: number; width: number; height: number };
     actionRect?: { top: number; left: number; width: number; height: number };
     contextSentence: string;
     sourceId: string;
     targetLanguage: "vi";
     kind: "word" | "phrase";
     clientMetrics?: { wordsBeforeSelected: number };
   }
   ```
2. Add `kind` to the returned `TranslationSelection` in `selection-utils.ts`. Set `kind = "word"` when `countWords(selectedText) === 1`, else `"phrase"`.
3. Rewrite `src/features/reading/hooks/use-word-translation.ts`:
   - Same `TranslationState` shape (`idle | ready | loading | success | error`).
   - `translateWord()` flips state to `loading` immediately, then after 200ms resolves with a placeholder lookup:
     ```ts
     const PLACEHOLDER: Record<string, TranslationDto> = {
       priority: { translation: "LÀM", type: "n.", ipa: null, provider: "fallback" },
       gesture:  { translation: "cử chỉ", type: "n.", ipa: null, provider: "fallback" },
     };
     const key = selectedText.trim().toLowerCase();
     const data = PLACEHOLDER[key] ?? { translation: null, type: null, ipa: null, provider: "fallback" };
     ```
   - Phase C replaces this body with `fetch('/api/translate', …)`.
4. Rewrite `src/features/reading/hooks/use-content-state.ts`:
   - Composes `useWordTranslator(passageId, viewMode)` + a no-op `useVocabulary(...)`.
   - Returns the merged object listed in Requirements.
5. Rewrite `src/features/reading/components/translation-popup.tsx`:
   - Two layouts sharing positioning.
   - **Word layout**: bold target word (size +1), `IPA —`, `POS —`, 1–2 short meanings (truncate to 2 lines via `line-clamp-2`), `Lưu` button (disabled with grey style), `Chi tiết` link (disabled).
   - **Phrase layout**: translated text block (truncate to 2 lines), `Copy` button (writes to clipboard), `Save phrase` button (text only, ghost).
   - **Loading**: 3 skeleton lines.
   - **Not found**: "Không tìm thấy bản dịch" + dismiss.
   - **Icon state** (`status === "ready"`): floating 32px circle, click triggers `onTranslate`. Same math as the original.
6. Rewrite `src/features/reading/components/content-panel.tsx`:
   - Pass the new `selectionKind` and `toggleSave` to `TranslationPopup`.
   - No Studio tab yet — Phase E.
7. Run `pnpm typecheck && pnpm lint`.

## Success Criteria

- [ ] Selecting a single word from the study page shows the popup with placeholder text within 1 frame.
- [ ] Selecting 2+ words shows the phrase layout.
- [ ] The popup width is 280px (word) or 240px (phrase).
- [ ] Selecting an unknown word shows "Không tìm thấy bản dịch" — no fetch goes out.
- [ ] `pnpm typecheck && pnpm lint` green.

## Risk Assessment

- Phase B popup is fully visible to users. Designers may want to lock colors/typography before Phase C ships real translations. Per-phase review gate: pause for sign-off after Phase B.
- The 200ms simulated latency is intentional. Without it, the skeleton never appears.

## Security Considerations

- No new endpoints; no new env vars. Same auth model.