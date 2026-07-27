---
title: "Inline Word Translate"
description: "Click-to-translate popup for exactly one English word in the study reader, using the existing /api/translate route and an isolated unofficial Google Translate provider."
status: pending
priority: P2
effort: "2d"
branch: preview
tags: [feature, frontend, reading, api]
blockedBy: []
blocks: []
created: 2026-07-27
---

# Inline Word Translate

## Overview

In the study reader's passage view, selecting exactly one English word exposes a small translation icon. Clicking the icon opens a single-popup result panel anchored to the selected word. The browser calls the existing `POST /api/translate` route, which delegates to a newly isolated unofficial Google Translate provider. The provider runs only on the server and is the only place that knows the request format, so a future migration to the official Google Cloud API is local.

The feature extends the existing translator hook, schema, and route. It does not add vocabulary capture, dictionary detail, IPA, phrase translation, persistent cache, history, or translation for PDF / video modes.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | One-word inline translation in passage view, with icon and click-to-open popup | P1 |
| 2 | Floating UI anchored to the browser selection with `bottom` placement + `flip` to top | P1 |
| 3 | Rapid selections cannot show stale results; foreign `requestId` always wins | P1 |
| 4 | `POST /api/translate` returns a real English → Vietnamese translation through the unofficial Google endpoint | P1 |
| 5 | Provider is isolated to one server module so it can be swapped without touching UI or hooks | P2 |
| 6 | Renders loading, success, empty-result, and error states; never crashes | P2 |

## Non-Goals

- Multi-word phrase translation.
- Dictionary entries, IPA, examples, definitions, synonyms, or pronunciation audio.
- Saving the translated word to the word bank.
- Persistent translation cache or history.
- Translation while the user is in PDF or video mode.
- Standalone translate / dictionary page (US-13).
- Authentication changes; the existing `auth.api.getSession` check in the route is enough.
- A new test runner; verification uses `pnpm typecheck`, `pnpm lint`, and focused Playwright interaction.

## Acceptance Criteria

1. Selecting exactly one English word inside the passage content shows a `Languages` icon below the word.
2. Selecting whitespace, punctuation only, multiple words, or content outside the passage produces no icon.
3. The icon is positioned below the selected word when there is room; when there is not, it flips above.
4. Clicking the icon requests `POST /api/translate` with the selected word, the surrounding sentence, and the passage id.
5. While the request is in flight, the popup shows a loading state.
6. On success, the popup shows the translated word, the source word, and a small "Google Translate" attribution.
7. When the provider returns no translation, the popup shows an empty state and does not crash.
8. When the provider fails or the route errors, the popup shows an error state with a retry button.
9. A new selection, outside click, Escape, passage change, or view-mode change closes or resets the popup immediately.
10. Two rapid selections produce two popup updates; the slower one never replaces the newer one.
11. `pnpm typecheck` and `pnpm lint` pass after the change.
12. `pnpm knip` shows no new unused exports or files.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Selection and Overlay](./phase-01-selection-and-overlay.md) | Pending |
| 2 | [Client Server Translation](./phase-02-client-server-translation.md) | Pending |
| 3 | [Verification and Docs](./phase-03-verification-and-docs.md) | Pending |

## Cross-Plan Dependencies

| Relationship | Plan | Status |
|--------------|------|--------|
| None | — | — |

The existing in-progress `260726-1523-studio-artifact-row-cache` plan targets a different feature and shares no files.

## Architectural Notes

- The translator hook already exposes `useWordTranslator()` via `useContentState()`. Phase 1 only needs to add a new `handleSelectionFromMouseUp` and a `virtualAnchor` factory; it does not change the state shape.
- The popup is rendered through a `FloatingPortal` from `@floating-ui/react` so its z-index, stacking, and outside-click handling are independent of the passage scroll container.
- The provider module is the only file allowed to import the unofficial Google Translate endpoint. It validates the URL, sends a controlled request, parses the response, and returns either a `TranslationDto` or a typed failure. Clients and the route know only the success / failure shape.
- The route already validates body shape with `zod` and gates on `auth.api.getSession`. Phase 2 keeps that contract; only the service body changes.

## File Ownership Summary

| Action | File | Reason |
|--------|------|--------|
| Modify | `src/features/reading/components/content-panel.tsx` | Mount the selection bridge and the popup in passage view |
| Create | `src/features/reading/components/inline-translation-popup.tsx` | Floating UI popup with idle / loading / success / empty / error states |
| Create | `src/features/reading/utils/selection-to-word-selection.ts` | Parse `Selection`, validate single lexical word, capture `Range`, build virtual anchor |
| Modify | `src/features/reading/hooks/use-word-translation.ts` | Replace placeholder timer with `fetch("/api/translate")` + abort, keep stale-token guard |
| Modify | `src/features/reading/server/services/inline-translate.ts` | Replace placeholder body with the unofficial Google Translate call |
| Modify | `src/app/api/translate/route.ts` | No structural change; document the new provider contract |

## Risks

| Risk | Mitigation |
|------|------------|
| Unofficial Google Translate endpoint changes or throttles | All requests go through one service module with timeout, retries, and a typed failure path. Swap to the official Google Cloud API is local to that file. |
| `Selection` is `null` or collapsed right after a click | `selection-to-word-selection.ts` returns `null` for any invalid scenario; the bridge ignores it. |
| Popup drifts outside the reader due to scroll | Anchor reads from the live `Range.getClientRects()` each time `useFloating` recomputes; closing logic resets on scroll out of view. |
| Two selections fire race conditions | The hook keeps a monotonically increasing `requestId`; only the latest applies. |
| Provider returns HTML instead of JSON | Provider response is guarded by content-type and parsed only when it matches; otherwise it returns a typed failure. |
| Knip picks up unused exports | Phase 3 deletes the placeholder lookup map and re-checks `pnpm knip`. |

## Validation Strategy

- `pnpm typecheck` — must pass.
- `pnpm lint` — must pass.
- `pnpm knip` — must not show new dead exports.
- Manual / Playwright walk-through:
  1. Select `gesture` → icon appears below the word.
  2. Click the icon → popup opens with Vietnamese translation.
  3. Select `priority` next → popup resets and re-translates.
  4. Select two words → no icon.
  5. Press `Escape` → popup closes.
  6. Click outside → popup closes.
  7. Switch to PDF mode → popup closes; switching back does not reopen.
- Provider smoke test: `curl` the server service directly with a known English word and assert a non-empty `translation` plus `provider === "google_translate"`.

## Out of Scope for Re-Plan

- Replacing the placeholder timer with streamed upserts.
- Adding a client-side cache or persistent log.
- Linking to the vocabulary feature (use-store-vocabulary stays a placeholder).
- Editorial state for `ipa`; the route continues to surface `ipa: null`.
