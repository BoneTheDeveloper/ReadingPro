---
title: "Phase B: Placeholder UI (Floating UI)"
phase: b
status: pending
priority: P1
effort: 6h
dependencies: [phase-a-cleanup]
---

# Phase B: Placeholder UI (Floating UI)

## Overview

Render the popup with hardcoded data on selection. No fetch. Skeleton appears immediately. Word popup and phrase popup are both fully styled. Positioning is delegated to **Floating UI** (`@floating-ui/react`) with a virtual anchor built from `selectionRect` — no hand-rolled above/below flip math.

## Requirements

- Functional
  - Selecting text on the study page → popup shows: target text (bold), IPA placeholder `—`, POS placeholder `—`, 1–2 short meanings (mock strings), `Lưu` button (disabled), `Chi tiết` link (disabled).
  - **Phrase popup deferred.** For Phase 2 the popup only renders the word layout. The phrase layout is added when a real phrase translation is wired up (later phase). `kind` is added to the schema for forward compatibility but the popup ignores it.
  - Loading skeleton appears immediately on `mouseup`.
  - Not-found state (test path: select a punctuation-only string) shows "Không tìm thấy bản dịch".
- Non-functional
  - Popup is 280px wide regardless of selection length.
  - Positioning: Floating UI `useFloating` with `placement: "top"` (preferred) flipping to `"bottom"` automatically. Anchor is a virtual element built from `selectionRect`. **No `calculateStudyTranslationPopupPosition` / `calculateStudyTranslationIconPosition` functions.**
  - The icon (status === "ready") and the panel use the same hook with different `placement` / `strategy` config.
  - `useContentState` returns: `viewMode`, `setViewMode`, `selectedWordInfo`, `translationState`, `selectionKind`, `saved`, `toggleSave`, `isVocabularySaved`, `handleWordSelection`, `translateWord`, `handleSaveVocabulary`.
  - `pnpm typecheck && pnpm lint` green.

## Architecture

- New dep: `@floating-ui/react@^0.27.20` (already installed during planning).
- New private module: `src/features/reading/lib/use-translation-popup-position.ts`. Hook wraps `useFloating` from `@floating-ui/react` and accepts a `VirtualElement` built from `selectionRect`. Returns `{ refs, floatingStyles, placement }`. Both icon and panel branches consume this hook.
- The `VirtualElement` is a plain object with `getBoundingClientRect()` returning `selectionRect`. This leaves the DOM untouched (no extra hidden span, no layout shift) — same approach Google Translate extensions use.
- `useWordTranslator` returns placeholder data from a static lookup keyed by `selectedText.toLowerCase()`. Miss → `data.translation === null`. 200ms simulated latency exercises the skeleton → success transition.
- `useContentState` composes `useWordTranslator` + a no-op `useVocabulary` (Phase B version: `{ saved: false, toggleSave: () => {}, isVocabularySaved: false, handleSaveVocabulary: async () => {} }`).
- `translation-popup.tsx` branches on `selectionKind === "word" ? wordLayout : phraseLayout`. Both layouts share the position hook.
- `content-panel.tsx` mounts the popup exactly as before; only prop names change.

## Related Code Files

Refer to top-level **File Inventory** in `plan.md`.

This phase owns:
- create: `src/features/reading/lib/use-translation-popup-position.ts` (new hook — Floating UI wrapper)
- rewrite: `src/features/reading/schemas/translation.ts`
- modify: `src/features/reading/lib/selection-utils.ts`
- rewrite: `src/features/reading/hooks/use-word-translation.ts`
- rewrite: `src/features/reading/components/translation-popup.tsx`
- rewrite: `src/features/reading/hooks/use-content-state.ts`
- rewrite: `src/features/reading/hooks/use-store-vocabulary.ts` (replace real impl with the plan's no-op stub — the vocabulary-save-toggle plan replaces this file in full)
- rewrite: `src/features/reading/components/content-panel.tsx`
- modify: `package.json` (already updated — `@floating-ui/react@^0.27.20`)

The five rewrite files form the inline-translate UI chain. **Rewrite each from scratch by reading the original only as a reference.** Copy only the static hex/colour tokens and the `useEffect` for Escape + outside-click dismiss; the positioning math is replaced by Floating UI.

## Implementation Steps

1. Update `src/features/reading/schemas/translation.ts`:
   ```ts
   export interface TranslationDto {
     translation: string | null;
     type: string | null;
     ipa: string | null;
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
2. Add `kind: "word"` to the returned `TranslationSelection` in `selection-utils.ts` (constant for now — phrase detection is deferred). Schema declares `kind: "word" | "phrase"` for forward compatibility.
3. Create `src/features/reading/lib/use-translation-popup-position.ts`:
   ```ts
   import { useEffect, useMemo, useRef } from "react";
   import {
     useFloating,
     autoUpdate,
     flip,
     offset,
     shift,
     type VirtualElement,
     type Placement,
   } from "@floating-ui/react";
   import type { TranslationSelection } from "@/features/reading/schemas/translation";

   interface UseTranslationPopupPositionInput {
     selection: TranslationSelection;
     placement?: Placement;
     offsetPx?: number;
     widthPx: number;
   }

   export function useTranslationPopupPosition({
     selection, placement = "top", offsetPx = 8, widthPx,
   }: UseTranslationPopupPositionInput) {
     // Virtual element: a DOM-less anchor built from selectionRect.
     const anchor = useMemo<VirtualElement>(
       () => ({
         getBoundingClientRect() {
           const r = selection.selectionRect;
           return {
             top: r.top, left: r.left, right: r.left + r.width,
             bottom: r.top + r.height, width: r.width, height: r.height,
             x: r.left, y: r.top, toJSON: () => ({}),
           };
         },
       }),
       [selection.selectionRect],
     );

     const anchorRef = useRef<VirtualElement | null>(null);
     useEffect(() => { anchorRef.current = anchor; }, [anchor]);

     const { refs, floatingStyles, placement: resolvedPlacement, update } =
       useFloating({
         placement,
         strategy: "fixed",
         middleware: [
           offset(offsetPx),
           flip({ padding: 8 }),
           shift({ padding: 8 }),
         ],
       });

     // Auto-update while the popup is mounted (handles scroll / resize).
     useEffect(() => {
       if (!anchorRef.current) return;
       return autoUpdate(anchorRef.current, refs.floating.current, update);
     }, [refs.floating, update, selection.selectedText]);

     return {
       getReferenceProps: () => ({ ref: anchorRef }),
       getFloatingProps: () => ({ ref: refs.setFloating }),
       floatingStyles: { ...floatingStyles, width: widthPx },
       resolvedPlacement,
     };
   }
   ```
   Width is fixed at `widthPx` regardless of selection width — we do not want a 50px-wide popup when the user selects a single short word.
4. Rewrite `src/features/reading/hooks/use-word-translation.ts`:
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
5. Rewrite `src/features/reading/hooks/use-content-state.ts`:
   - Composes `useWordTranslator(passageId, viewMode)` + `useVocabulary(...)` from the no-op `use-store-vocabulary.ts`.
   - Returns the merged object listed in Requirements.
6. Rewrite `src/features/reading/hooks/use-store-vocabulary.ts`:
   - Replace the real implementation with the plan's no-op stub:
     ```ts
     import type { TranslationSelection, TranslationDto } from "@/features/reading/schemas/translation";
     export function useVocabulary(
       _selectedWordInfo: TranslationSelection | null,
       _translationData: TranslationDto | null,
     ) {
       return {
         savedVocabularyIds: new Set<string>(),
         isVocabularySaved: false,
         handleSaveVocabulary: async () => {},
       };
     }
     ```
   - The vocabulary-save-toggle plan replaces this file when the real save flow ships.
7. Rewrite `src/features/reading/components/translation-popup.tsx`:
   - Delete `calculateStudyTranslationPopupPosition` and `calculateStudyTranslationIconPosition` entirely.
   - Use `useTranslationPopupPosition({ selection, placement: status === "ready" ? "bottom-start" : "top", widthPx: 280 })`.
   - Apply `floatingStyles` to the floating element; no manual `top` / `left` styles.
   - **Word layout (only)**: bold target text (size +1), `IPA —`, `POS —`, 1–2 short meanings (truncate to 2 lines via `line-clamp-2`), `Lưu` button (disabled with grey style), `Chi tiết` link (disabled).
   - **Loading**: 3 skeleton lines.
   - **Not found**: "Không tìm thấy bản dịch" + dismiss.
   - **Icon state** (`status === "ready"`): floating 32px circle, click triggers `onTranslate`. Same `useTranslationPopupPosition` hook with `placement: "bottom-start"`.
   - Keep the Escape + outside-click `useEffect` from the original (study-page behaviour).
8. Rewrite `src/features/reading/components/content-panel.tsx`:
   - Pass the new `selectionKind` and `toggleSave` to `TranslationPopup`.
   - No Studio tab yet — Phase E.
9. Run `pnpm typecheck && pnpm lint && pnpm knip`.

## Success Criteria

- [ ] Selecting text on the study page shows the popup with placeholder text within 1 frame.
- [ ] The popup width is 280px (word only — phrase layout deferred).
- [ ] Selecting an unknown word shows "Không tìm thấy bản dịch" — no fetch goes out.
- [ ] `calculateStudyTranslationPopupPosition` and `calculateStudyTranslationIconPosition` are gone from the codebase (`git grep` returns no hits).
- [ ] `pnpm typecheck && pnpm lint` green.

## Risk Assessment

- **Floating UI virtual element updates** — `autoUpdate` re-runs when the contents or viewport change. If the wrapping element scrolls while the popup is open, the popup follows. If the user dismisses the popup mid-scroll, the effect cleanup must run; the `useEffect` return path handles that.
- **Rect freshness** — `getBoundingClientRect` is read on every Floating UI middleware pass. If `selectionRect` was captured at mouseup time and never updates, the popup stays at the original spot even if the user scrolls the selection. Acceptable for Phase B (selection usually doesn't move after mouseup), but Phase C should consider re-deriving the rect from the live selection.
- **Phase B popup is fully visible to users.** Designers may want to lock colors/typography before Phase C ships real translations. Per-phase review gate: pause for sign-off after Phase B.
- **The 200ms simulated latency is intentional.** Without it, the skeleton never appears.

## Security Considerations

- No new endpoints; no new env vars. Same auth model.
- Virtual element never touches the DOM, so introducing it does not widen the XSS surface.
