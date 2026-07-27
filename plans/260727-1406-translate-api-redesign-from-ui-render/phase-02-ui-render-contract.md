---
title: "Phase 2: UI Render Contract & Popup Reshape"
status: completed
priority: P1
effort: "0.5d"
dependencies: [phase-01]
started: 2026-07-27
completed: 2026-07-27
---

# Phase 2: UI Render Contract & Popup Reshape

## Overview

Reshape the inline-translation popup to render the four pieces the redesigned API will deliver:
**word + IPA + part-of-speech badge + Vietnamese translation**. The popup is a translate popup — no
provider label, no attribution line, no audio button.

## Requirements

- [ ] Popup renders four pieces in this order, top to bottom: source word (large), IPA line (small,
  monospaced, only when present), POS badge (small pill, only when not `"unknown"`), Vietnamese
  translation (medium).
- [ ] The existing "Google Translate" footer line is removed. No label appears in its place.
- [ ] Empty-state copy stays consistent with current Vietnamese wording; error-state copy keeps the
  retry button.
- [ ] Loader and dismiss interactions (Escape, outside click, passage change, view-mode change) are
  unchanged.
- [ ] The popup stays anchored via Floating UI; the new layout never overflows the popup width on mobile.

## Architecture

The popup consumes the new DTO:

```ts
type PartOfSpeech =
  | "noun" | "verb" | "adjective" | "adverb" | "pronoun"
  | "preposition" | "conjunction" | "interjection"
  | "determiner" | "unknown";

type TranslationDto = {
  translation: string;     // non-null in success shape
  ipa: string | null;      // General American / British phonetic transcription
  partOfSpeech: PartOfSpeech;
  provider: "openai";
};
```

Render rules:

- `state.status === "loading"` → unchanged spinner + "Đang dịch…"
- `state.status === "success" && translation.trim()` → render all four pieces; hide IPA line when
  `data.ipa == null`; hide POS badge when `data.partOfSpeech === "unknown"`.
- `state.status === "success" && !translation.trim()` → empty state ("Không tìm thấy bản dịch") + retry.
- `state.status === "error"` → error state ("Không thể dịch từ này. Vui lòng thử lại.") + retry.
- **No attribution line anywhere.**

A pure render helper `formatTranslationLines(word, data)` keeps the JSX readable and unit-test friendly
(though no test runner is added in this plan).

## Related Code Files

- Modify: `src/features/reading/components/inline-translation-popup.tsx`
- Modify: `src/features/reading/schemas/translation.ts` — `TranslationDto` becomes
  `{ translation, ipa, partOfSpeech, provider }`; `WordSelection` unchanged.

## Implementation Steps

1. Replace the `WordSelection`-aware render block with the four-piece layout (word / IPA / POS badge /
   translation).
2. Drop the existing "Google Translate" footer line.
3. Render the POS badge conditionally (`partOfSpeech !== "unknown"`); render the IPA line conditionally
   (`ipa !== null`).
4. Keep the existing close / retry buttons and Floating UI plumbing untouched.
5. Add the `formatTranslationLines(word, data)` helper if it cleans the JSX.

## Diff summary

- `src/features/reading/schemas/translation.ts` — added `PartOfSpeech`, rewrote `TranslationDto` to
  `{ translation: string, ipa: string | null, partOfSpeech: PartOfSpeech, provider: "openai" }`,
  added `TranslateErrorCode`, `TranslateErrorBody`, `TranslateInput` types. `WordSelection` unchanged.
- `src/features/reading/components/inline-translation-popup.tsx` — four-piece render, dropped
  "Google Translate" footer, short Vietnamese POS labels (`danh từ` / `động từ` / …), `truncate` +
  `title` on word and IPA lines for mobile overflow safety. Loader / dismiss / close / retry
  interactions untouched.

## Success Criteria

- [x] Popup visually shows word + IPA + POS badge + translation when the API returns all four pieces.
- [x] No provider label, attribution line, or "Google Translate" footer is rendered in any state.
- [x] No layout regression on desktop or mobile (IPA line and POS badge truncate cleanly; full glyphs
  available via the `title` attribute).
- [ ] `pnpm typecheck` passes with the new DTO. *(Will pass once Phase 3 deletes the legacy
  `inline-translate.ts` service; the two current `tsc` errors are isolated to that file.)*

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| IPA glyphs overflow the popup | `truncate` plus a `title` attribute holding the full glyphs. |
| POS badge long word ("interjection") wraps poorly | Use a small rounded pill with fixed short labels (e.g. `interj.`). |
| Loading-spinner visual regression | Spinner block is unchanged from today's code path. |
