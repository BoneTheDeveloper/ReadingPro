---
phase: 4
title: "Reading flow: route selection to Studio, Pro inline popup"
status: pending
priority: P1
effort: "0.5d"
dependencies: [3]
---

# Phase 4: Reading flow: route selection to Studio, Pro inline popup

## Goal

Selecting a word and pressing **Dịch** opens the Studio **Tra từ** view for
Free users. Pro users get the in-place popup with dictionary meanings, the AI
context meaning, quick save and **Xem chi tiết**.

## Files to Create / Modify

- Modify: `src/client/routes/study/study-workspace.tsx` (lift the Studio view state)
- Modify: `src/client/features/reading/components/content-panel.tsx` (`onLookup` prop, Pro branch)
- Modify: `src/client/features/reading/components/inline-translation-popup.tsx` (Pro inline content)
- Modify: `src/client/features/studio/components/panel/studio-panel.tsx` (only if prop names change)

## Tasks & Steps

1. **Lift the view state.**
   - In `StudyWorkspace`, replace `StudioSlot`'s local `view` state with
     `useState<{ passageId: string | null; view: StudioPanelView }>`.
   - Derive `view = state.passageId === library.activeId ? state.view : null`
     so a passage change still resets the view without an effect.
   - Keep the existing resize effect, moved next to the lifted state.
   - Remove `key={contentKey}` from `StudioSlot` only if the derived reset
     makes it redundant. Keep it if `ChatProvider` still needs a remount.
2. **`openLookup(request)`.**
   - In `StudyWorkspace`, expand the right panel if it is collapsed
     (`layout.rightPanelRef.current?.expand()`).
   - Then set `{ passageId: activeId, view: { contentType: "lookup", request } }`.
   - Pass it to `ContentPanel` as `onLookup`.
3. **Content panel.**
   - Read `isPro` from `isProTier(useAppSelector(selectSessionUser)?.tier)`.
   - **Free:** the popup's **Dịch** button calls
     `onLookup({ word, context })` and clears the selection and popup. The
     `readingQueries.translate` query stays disabled.
   - **Pro:** **Dịch** expands the popup as today. Alongside it, call
     `useLookupWordMutation` so the dictionary meanings load and a row is
     recorded, and enable `readingQueries.translate` for the AI context
     meaning.
4. **Pro popup content.**
   - Show the headword and phonetic, the top 3 dictionary meanings, and the
     AI context meaning (labelled "Theo ngữ cảnh (AI)").
   - **Lưu** saves the AI meaning with the AI lemma and part of speech, the
     same payload as today.
   - **Xem chi tiết** calls `onLookup({ word, context })` with the stored row
     already cached.
   - If the dictionary is not found, show only the AI meaning and **Xem chi
     tiết** (the view then shows external translators).
   - If AI fails, show the dictionary meanings with a retry for the AI part.
5. Keep the selection rules in `word-selection.ts` unchanged.

## Verification

- `pnpm typecheck && pnpm lint`
- Manual with a FREE test user, which is the default after sign-up:
  - Select a word and press **Dịch**. The Studio view opens and the right
    panel expands if it was collapsed.
  - The network tab shows `POST /api/word-lookup` and no `/api/translate`.
- Manual with a PRO user (`UPDATE "User" SET "tier"='PRO' WHERE "email"=...`,
  then sign out and in again to refresh the session cookie cache):
  - The in-place popup shows the dictionary and AI meanings, quick save works,
    and **Xem chi tiết** opens the view without a second lookup request.
- Switching passages closes an open lookup view.

## Risks / Rollback

- Lifting the view state touches the chat view's remount behavior. Check that
  the chat history still loads per passage after switching back and forth.
