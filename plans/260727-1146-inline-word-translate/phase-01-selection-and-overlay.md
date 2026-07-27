---
phase: 1
title: "Selection and Overlay"
status: pending
priority: P1
effort: "1d"
dependencies: []
---

# Phase 1: Selection and Overlay

## Overview

Add a `mouseup` bridge on the passage surface, a small `selection-to-word-selection` helper, and a `InlineTranslationPopup` component. The popup renders an idle action icon that anchors to the user's selection through Floating UI, prefers placement below the selection, flips above when space is short, and shifts inside the viewport horizontally. It does not talk to the network yet; translation is wired in Phase 2.

## Context Links

- `src/features/reading/components/content-panel.tsx` (existing)
- `src/features/reading/hooks/use-content-state.ts` (existing translator seam)
- `src/features/reading/hooks/use-word-translation.ts` (existing state machine; will be extended in Phase 2)
- `src/features/reading/schemas/translation.ts` (existing schema; reused)
- `docs/design.md` (design tokens for popup chrome)
- `@floating-ui/react` 0.27 (`useFloating`, `FloatingPortal`, `offset`, `flip`, `shift`, `dismiss`, `useClick`, `useRole`)

## Requirements

### Functional

- A `mouseup` listener on the passage container produces a `WordSelection` when the user has selected exactly one lexical English word and nothing else.
- The selection helper:
  - Returns `null` if `window.getSelection()` is missing, collapsed, or empty.
  - Returns `null` if the selection crosses an element boundary not inside the passage container.
  - Trims leading / trailing ASCII punctuation and any inner whitespace runs to a single lexical token.
  - Rejects numbers, single-letter tokens, multi-word, and tokens containing non-Latin scripts.
  - Captures the entire enclosing `<p>` text as `contextSentence`.
  - Captures a live `DOMRect` (via `range.getBoundingClientRect()`) for Floating UI anchoring.
  - Captures a `Range` object so anchor coordinates refresh after scroll.
- `InlineTranslationPopup` renders:
  - `idle` — small round button labelled `Languages` from `lucide-react`.
  - `ready` — same as `idle`; the icon stays usable until clicked.
  - `loading` — disabled icon + spinner.
  - `success` — word, translation, `Google Translate` caption.
  - `empty` — copy "Không tìm thấy bản dịch" and a retry button.
  - `error` — short message + retry.
- Outside click closes the popup. Escape closes the popup. New selection replaces the popup state. Passage or viewMode change resets state via the existing hook.

### Non-Functional

- Popup chrome follows design.md tokens (radius `radius-xl`, popup shadow, indigo primary).
- Component must be a client component; no SSR.
- No `node_modules` reads at runtime; all imports stay within the project's boundary.

## Architecture

```
passage <div ref={contentRef}>
  └── onMouseUp:
        capture → selection-to-word-selection.ts
        ├─ valid → setSelectedWordInfo(...)
        │            └─ <InlineTranslationPopup
        │                  selection={...}
        │                  state={translationState}
        │                  onTranslate={translateWord}
        │                  onClose={reset} />
        └─ invalid → no-op
```

Floating UI stack:

```ts
useFloating({
  placement: "bottom",
  middleware: [offset(8), flip({ fallbackPlacements: ["top"] }), shift({ padding: 8 })],
  strategy: "fixed",
})
useDismiss(floating.context, { enabled: !!selection, escapeKey: true, outsidePress: true })
useRole(floating.context, { role: "tooltip" })
```

The virtual reference reads from the live `Range` so each repositioning reflects scroll and zoom changes.

## Related Code Files

- Create: `src/features/reading/utils/selection-to-word-selection.ts`
- Create: `src/features/reading/components/inline-translation-popup.tsx`
- Modify: `src/features/reading/components/content-panel.tsx`
- Modify (Phase 2 will modify): `src/features/reading/hooks/use-word-translation.ts`

## Implementation Steps

1. **Add the selection helper.**
   - `normalizeToken(text)`: trim a small punctuation set `[.,;:!?()"'`-]`, collapse internal whitespace, reject if `length === 0` or `<= 1`.
   - `isLatinWord(token)`: matches `/^[A-Za-z][A-Za-z'-]*$/` to keep the prototype conservative.
   - `extractParagraph(range)`: walks up the DOM until it finds an ancestor `<p>`, returning `.textContent` if found or `null` otherwise.
   - `findPassageRoot(range, contentRef)`: walks up the DOM, returning the matching ancestor element equal to `contentRef.current`, or `null`.
   - `selectionToWordSelection(selection, contentRef, sourceId)` combines the above and returns `{ selectedText, contextSentence, sourceId, targetLanguage: "vi", range, rect }` or `null`.
2. **Write the popup component.**
   - Define props: `{ selection: WordSelection & { range: Range; rect: DOMRect } | null; state: TranslationState; onTranslate: () => void; onClose: () => void }`.
   - Track `floatingStyles`, `refs`, `getFloatingProps`, `getReferenceProps`.
   - Render the reference inside `FloatingPortal` when the selection is non-null.
   - Render state branches; the `idle` / `ready` branch is the icon.
3. **Mount the bridge inside content-panel.**
   - `import` the helper, the popup, and wire `selectedWordInfo`, `translationState`, `handleWordSelection`, `translateWord`, plus a new `clearSelection` (call `handleWordSelection(null)`).
   - On view-mode change or `passage.id` change, the popup is already closed by the existing hook effect; no extra cleanup is needed.
   - Bind `onMouseUp` on the passage `<div ref={contentRef}>` so it scopes to readable content and not the toolbar.
   - Pass `contentRef` and the live `WordSelection` into the popup.
4. **Wire dismiss behaviour.**
   - `useDismiss` already closes on Escape and outside click; on outside click, call `handleWordSelection(null)` via the existing `onClose` to keep hook state consistent.
5. **No network in this phase.**
   - Phase 1 leaves `translateWord` as the existing 200 ms placeholder so the icon, popup, and Floating UI positioning are verifiable in isolation.

## Success Criteria

- [ ] `selection-to-word-selection.ts` rejects whitespace, multi-word, non-Latin, and out-of-passage selections with `null`.
- [ ] `InlineTranslationPopup` renders the `Languages` icon below `gesture` after selecting that word, and flips above when the selection is near the bottom of the passage container.
- [ ] Escape and outside clicks close the popup and clear `selectedWordInfo`.
- [ ] Switching `viewMode` to `pdf` or `video` closes the popup and resets state.
- [ ] `pnpm typecheck`, `pnpm lint` pass with the new files.

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Floating UI virtual references and `Range` references become stale after scroll | Re-read `range.getBoundingClientRect()` inside the popup's positioning effect; recompute on `resize` and `scroll` via `useDismiss` and Floating UI's auto-update |
| Helper accepts contractions that bridge sentences | Run `normalizeToken` then verify the result contains at most one whitespace run; reject otherwise |
| Mouse up after a drag on links / images leaks through | The passage container has no `<a>` or `<img>` in scope; this is acceptable for the prototype |
| Popup overlays the segmented toggle or header | Stacking is handled with `z-50` and `FloatingPortal`, matching the existing dialog and sheet primitives |
