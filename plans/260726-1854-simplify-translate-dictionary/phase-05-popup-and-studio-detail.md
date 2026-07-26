---
title: "Phase 5: Popup + Studio Detail Rewrite"
status: pending
priority: P1
effort: 8h
dependencies: [phase-02-provider-and-cache, phase-03-persistence-cleanup-and-toggle-save, phase-04-dictionary-feature-deletion]
---

# Phase 5: Popup + Studio Detail Rewrite

## Overview

Two popup variants (compact word + sparser phrase), a Chi tiết studio tab, and the explicit UI states (loading-skeleton-on-mouseup, success, not-found). Wire the toggle Save/Đã lưu to `toggleVocabularyItemAction`. Keep the existing `useWordTranslator` shape so `useContentState` and `content-panel.tsx` need only minor prop tweaks.

## Requirements

- Functional
  - Word popup shows: target word in bold (size +1), IPA placeholder (`—`), POS placeholder (`—`), 1–2 short meanings (max 2 lines), Save toggle, Chi tiết.
  - Phrase popup shows: translated text (single block), Copy button, Save phrase button (less prominent).
  - Save toggle: "Lưu" ↔ "Đã lưu" → calls `toggleVocabularyItemAction`; the action is invoked with the current selection snapshot.
  - "Chi tiết" → calls `fetch('/api/translate?full=1', { method: 'POST', body })` → renders the full payload in the Studio panel under a new "Translation" tab.
  - Loading skeleton appears immediately on `mouseup`; no waiting for the network.
  - "Not found" message: "Không tìm thấy bản dịch".
- Non-functional
  - Word popup width: 250–300px. Phrase popup width: 220–280px.
  - The popup's positioning math from the existing `translation-popup.tsx` is preserved.
  - `useContentState` API stays compatible (returns the same fields); only the inner content of `TranslationPopup` changes.

## Architecture

- `src/features/reading/components/translation-popup.tsx` — split into two internal branches based on `selection.kind: "word" | "phrase"`. Each branch renders its own fields. Save toggle replaces the old single-action button.
- `src/features/reading/components/translation-detail-card.tsx` — new component, used inside the Studio panel when "Chi tiết" is clicked. Reads `selectedFullTranslation` from a small Zustand-style hook.
- `src/features/reading/hooks/use-full-translation.ts` — new hook. Calls `fetch('/api/translate?full=1', …)`; exposes `{ data, status, error }`.
- `src/features/reading/hooks/use-translation-selection.ts` — new hook. Decides word vs phrase: `selectedText.trim().split(/\s+/).length === 1 ? "word" : "phrase"`.
- `src/features/reading/server/services/full-translation.ts` — service. Returns `{ kind: "word", word, ipa: null, pos: null, meanings: string[] }` or `{ kind: "phrase", text, language: "vi" }`. The route handler (Phase 2) calls this service when `?full=1` is present.
- `src/features/reading/server/services/full-translation.ts` — service. Returns `{ kind: "word", word, ipa: null, pos: null, meanings: string[] }` or `{ kind: "phrase", text, language: "vi" }`.

## Related Code Files

Refer to the top-level **File Inventory** for full action+reason. This phase owns:

- rewrite: `src/features/reading/components/translation-popup.tsx`
- rewrite: `src/features/reading/hooks/use-word-translation.ts`
- rewrite: `src/features/reading/hooks/use-store-vocabulary.ts`
- rewrite: `src/features/reading/hooks/use-content-state.ts`
- rewrite: `src/features/reading/components/content-panel.tsx`
- modify: `src/features/reading/lib/selection-utils.ts`
- create: `src/features/reading/components/translation-detail-card.tsx`
- create: `src/features/reading/hooks/use-full-translation.ts`
- create: `src/features/reading/hooks/use-translation-selection.ts`
- create: `src/features/reading/server/services/full-translation.ts`

The four `rewrite` files together form the inline-translate UI chain. **Rewrite each file from scratch by reading the original only as a reference for behavior**, especially around positioning math (`calculateStudyTranslationPopupPosition` / `calculateStudyTranslationIconPosition`) — copy that math exactly, do not re-derive it.

## Implementation Steps

1. Add `TranslationSelection.kind: "word" | "phrase"` and `ipa: string | null`, `pos: string | null`. Default to `"word"` on existing selections for compat.
2. Implement `use-translation-selection.ts`:
   ```ts
   export function translationKind(selectionText: string): "word" | "phrase" {
     return selectionText.trim().split(/\s+/).length === 1 ? "word" : "phrase";
   }
   ```
3. Implement `use-full-translation.ts` hook that calls `fetch('/api/translate?full=1', { method: 'POST', body })`. Service returns `{ kind, …payload }`; the word payload includes 1–2 meanings fetched via `translateWithGoogle` (single-string split heuristic: split on `,` and trim; cap at 2 entries) — pragmatic for MVP, documented in header comment.
4. Wire `use-store-vocabulary.ts` to call `toggleVocabularyItemAction` instead of `saveVocabularyAction`. The hook exposes `{ saved: boolean, toggleSave(): void }`.
5. Rewrite `translation-popup.tsx`:
   - Layout width 280px default.
   - **Loading state**: `useLayoutEffect` flips `status` to `"loading"` the moment `kind` is set; show skeleton lines.
   - **Success state**:
     - Word: target word (bold, +1 step), placeholder IPA + speaker icon (greyed, `aria-disabled`), placeholder POS, 1–2 short meanings (max 2 lines), `Save`/`Đã lưu` button + `Chi tiết` link.
     - Phrase: translated text block (2 lines max), `Copy` button, `Save phrase` button (text only, ghost style).
   - **Not found**: "Không tìm thấy bản dịch" message + dismiss.
   - **Error**: "Không tìm thấy bản dịch" message + retry button.
6. Add Studio tab:
   - `translation-detail-card.tsx` reads from `useFullTranslation`; renders the payload as a definition list.
   - `content-panel.tsx` adds a "Translation" tab to the Studio panel when `selectedFullTranslation` is non-null.
7. Run `pnpm typecheck && pnpm lint && pnpm knip`.

## Success Criteria

- [ ] Word popup measured at 280px wide, ≤300px; phrase popup at 240px.
- [ ] Selecting a single English word shows the skeleton within the next frame (no API wait).
- [ ] Selecting a phrase triggers `fetch('/api/translate?full=1', …)` and the Studio Translation tab renders within 1s on a warm cache.
- [ ] Save toggles between "Lưu" and "Đã lưu"; clicking "Đã lưu" deletes the row.
- [ ] `pnpm typecheck && pnpm lint && pnpm knip` all green.

## Risk Assessment

- IPA / POS placeholders could be mistaken for working data by future devs. Add a `// TODO(inline-dict)` comment at the placeholder site so the next iteration can plug in `/translate_a/dict`.
- Studio panel currently hosts artifact rows for the active passage; the new Translation tab must not displace them. Use additive tab routing.

## Security Considerations

- The route (`/api/translate?full=1`) keeps Zod `.strict()` and reuses auth + passage ownership check.
- Direction locked to EN↔VI at the schema layer; same as Phase 2.

## Open Questions

- Word definition extraction heuristic (split on `,`, cap at 2). Acceptable for MVP; revisit after collecting user feedback.
- Should the Studio Translation tab persist across passage switches? Default: no — close on switch, fresh fetch on Chi tiết re-click.