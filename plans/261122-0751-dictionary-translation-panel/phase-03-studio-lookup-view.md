---
phase: 3
title: "Studio: Tra từ tile, lookup rows, detail view"
status: pending
priority: P1
effort: "1d"
dependencies: [2]
---

# Phase 3: Studio: Tra từ tile, lookup rows, detail view

## Goal

Add a **Tra từ** tool to Studio. It has a tile, a **Từ đã tra** row list per
passage, and a detail view with dictionary meanings, external translator
popups and a save form. The view must be openable from outside the Studio
panel.

## Files to Create / Modify

- Create: `src/client/features/dictionary/api/queries.ts` (`wordLookupQueries.list(passageId)`, `.detail(id)`)
- Create: `src/client/features/dictionary/api/mutations.ts` (`useLookupWordMutation`, `useDeleteLookupMutation`)
- Create: `src/client/features/dictionary/lib/external-translators.ts`
- Create: `src/client/features/dictionary/components/dictionary-entry-view.tsx` (senses, examples, "Xem thêm")
- Create: `src/client/features/dictionary/components/save-meaning-form.tsx`
- Create: `src/client/features/dictionary/components/external-translator-bar.tsx`
- Create: `src/client/features/dictionary/index.ts`
- Create: `src/client/features/studio/components/view/lookup/lookup-detail-view.tsx`
- Modify: `src/client/features/studio/components/panel/studio-icon-list.ts`
  (`"LOOKUP"` grid id, tile, `StudioPanelView` variant)
- Modify: `src/client/features/studio/components/panel/default-studio-view.tsx`
  (**Từ đã tra** section)
- Modify: `src/client/features/studio/components/panel/studio-panel.tsx`
  (render the lookup view, handle the tile)
- Modify: `src/client/features/studio/index.ts` (export the view type and helpers)

## Tasks & Steps

1. **View type.** Extend `StudioPanelView` with
   `{ contentType: "lookup"; lookupId?: string; request?: { word: string; context?: string } }`.
   - `request` starts a lookup.
   - `lookupId` reopens a stored row.
   - Neither shows the empty search state.
   - Add `lookup: 420` to `STUDIO_VIEW_SIZE` in
     `src/client/routes/study/study-workspace.tsx`.
2. **Tile.** Add `{ kind: "open", gridId: "LOOKUP", name: "Tra từ", action: "Tra từ", icon: BookA }`
   with its own tone from the existing tokens in `src/client/globals.css`. Do
   not invent new colors. Clicking it opens the view in its search state.
3. **Queries and mutations.**
   - `useLookupWordMutation` posts to `/api/word-lookup`. On success it
     seeds `wordLookupQueries.detail(lookup.id)` with the response and
     invalidates `wordLookupQueries.list(passageId)`.
   - A `dictionary.not_found` error is rendered inside the view
     (`meta: { silent: true }` pattern), not as a toast.
4. **Detail view `lookup-detail-view.tsx`.** It wraps `StudioDetailView`
   with the title "Tra từ".
   - **Search state:** an input with an "Tra" submit. Submitting posts with
     no context.
   - **Request state:** fire the mutation once per `request` object (keyed
     by word and context), and show a loader.
   - **Found:** show `dictionary-entry-view`:
     - display headword and phonetic;
     - one block per sense group with its raw label and a part-of-speech
       badge;
     - the first 3 meanings visible and the rest behind "Xem thêm";
     - examples collapsed under each meaning;
     - the context sentence quoted if present.
   - **Not found:** show "Không có trong từ điển" plus the translator bar.
     No row is created.
   - **Footer:** translator bar, then save form.
5. **External translators.** `external-translators.ts` exports a list of
   `{ id, label, url(word, sentence?) }`:
   - Google Dịch, từ: `https://translate.google.com/?sl=en&tl=vi&text={w}&op=translate`
   - Google Dịch, câu: same URL with the sentence. Shown only when there is
     context.
   - Cambridge: `https://dictionary.cambridge.org/dictionary/english-vietnamese/{w}`
   - Oxford Learner's: `https://www.oxfordlearnersdictionaries.com/definition/english/{w}`
   - DeepL: `https://www.deepl.com/translator#en/vi/{encoded text}`

   Open each with
   `window.open(url, "readingpro-translator", "popup,noopener,noreferrer,width=560,height=760")`.
   The fixed name reuses one window. Open every URL once by hand to confirm
   it still resolves.
6. **Save form `save-meaning-form.tsx`.**
   - Clicking a meaning selects it and fills an editable input (maximum 200
     characters, matching `TranslationSchema`). The part of speech comes from
     its group. The user may also type their own meaning and pick the part of
     speech.
   - "Lưu vào từ vựng" calls the existing `useCreateVocabularyMutation` with
     `term = headword`, `translation`, `partofSpeech`, `contextSentence` and
     `passageId`.
   - It shows "Đã lưu" after success and resets when the meaning changes.
7. **Row list.** In `default-studio-view.tsx`, below the artifacts, add the
   **Từ đã tra (n)** section from `wordLookupQueries.list(passageId)`.
   - Each row shows the headword and the first meaning as its subtitle.
   - Clicking a row opens `{ contentType: "lookup", lookupId }`, and each row
     has a delete action.
   - Reuse `ArtifactListItem` if its props fit. Otherwise create a sibling
     `lookup-list-item.tsx` with the same look.
8. **Upsell line.**
   - For non-Pro users (`isProTier`), show one muted line in the view:
     "Dịch nhanh tại chỗ và nghĩa theo ngữ cảnh (AI) có trong gói Pro." It
     has no link until billing exists.
   - Pro users see the AI context meaning block in this view too. It uses the
     existing `readingQueries.translate` with `enabled` set only for Pro.

## Verification

- `pnpm typecheck && pnpm lint`
- Manual (`pnpm dev:api` + `pnpm dev:web`, http://localhost:3000/study):
  - The **Tra từ** tile lets you search "running", and the entry for "run"
    appears.
  - A **Từ đã tra** row appears, survives a reload, and can be deleted.
  - Each translator button opens one popup window.
  - Saving appears in `/vocabulary` with the chosen meaning.
  - Searching "qzxv" shows the not-found state, and no row is added.

## Risks / Rollback

- The Studio panel can be narrow (280px default). The view sets a 420px target
  through `STUDIO_VIEW_SIZE`, and long meanings wrap.
