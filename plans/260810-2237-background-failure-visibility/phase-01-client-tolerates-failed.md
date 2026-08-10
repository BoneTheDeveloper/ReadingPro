---
title: "Phase 1: Client tolerates FAILED"
status: todo
---

# Phase 1: Client tolerates FAILED

## Overview

Teach the client that `FAILED` exists: stop polling on it, and render it as a distinct state.
Ships as a no-op — nothing writes `FAILED` yet — which is exactly why it goes first.

## Requirements

- [ ] Polling stops on `FAILED` as well as `COMPLETED`
- [ ] A `FAILED` passage row and artifact tile render a failed state, not a spinner
- [ ] A `FAILED` row is visibly non-interactive (no pointer cursor, no hover lift, not tabbable)
- [ ] Delete remains available on both surfaces — it is the only recovery action

## Architecture

Every break in this phase has one root cause: code that encoded "not `COMPLETED`" or fell into
an `else` when it meant "`PENDING`". Adding a third enum value turns each of those into a bug.
The positive `=== "COMPLETED"` checks elsewhere in the codebase survive untouched.

| Site | Written as | Result once `FAILED` exists |
|------|-----------|------------------------------|
| `passage/api/queries.ts:16` | `!== "COMPLETED"` | polls a dead row every 2s forever |
| `studio/api/queries.ts:26` | `!== "COMPLETED"` | same |
| `default-studio-view.tsx:23` | `if COMPLETED → "ready"; else → "pending"` | failed tile spins forever |
| `source-list-item.tsx:37` | `isPending` drives both visuals and the click gate | failed row looks clickable; the click is silently swallowed by `select` |

No fetch-layer change is needed. Detail queries are already unreachable for non-`COMPLETED`
rows via four positive guards (`use-passage-library.ts:13,38,67` and the `skipToken` in
`queries.ts:24`), and both Zod schemas use `z.enum(ProcessingStatus)` so `FAILED` already
parses.

## Related Code Files

- Modify: `src/features/passage/api/queries.ts`
- Modify: `src/features/studio/api/queries.ts`
- Modify: `src/features/passage/component/panel/source-list-item.tsx`
- Modify: `src/features/studio/component/panel/artifact-list-item.tsx`
- Modify: `src/features/studio/component/panel/default-studio-view.tsx`

## Implementation Steps

1. `src/features/passage/api/queries.ts:16` — `refetchInterval` predicate
   `(p) => p.status !== "COMPLETED"` → `(p) => p.status === "PENDING"`. Update the adjacent
   comment: the loop runs while work is in flight, not while work is unfinished.
2. `src/features/studio/api/queries.ts:26` — same change for artifacts.
3. `src/features/studio/component/panel/artifact-list-item.tsx:13` — widen
   `type ArtifactStatus = "ready" | "pending" | "failed"`. Add `const isFailed = status === "failed"`.
   Render: destructive-toned icon container with an error icon instead of `Loader2`, subtitle
   copy naming the recovery path (delete + regenerate), and `cursor-default` styling. The
   existing `onClick={() => { if (isReady) onClick(); }}` guard at `:39` is already correct —
   do not change it. Keep the `onDelete` dropdown.
4. `src/features/studio/component/panel/default-studio-view.tsx:23` — `mapProcessingStatus`
   gains an explicit `FAILED` case returning `"failed"`. Rewrite as an exhaustive switch on
   `ProcessingStatus` so a future enum value is a compile error rather than a silent spinner.
5. `src/features/passage/component/panel/source-list-item.tsx:37` — split the single
   `isPending` flag into `isPending` and `isFailed`. Apply to all four sites it currently
   drives: the interactive gate (`:42-46` — non-interactive for both), container styling
   (`:48-55`), the icon container (`:57-72` — error icon for failed), and the title/subtitle
   (`:80,:92`). Subtitle copy for failed must state the recovery path, e.g.
   `"Xử lý thất bại — xoá và tải lên lại"`.
6. Confirm `studio-panel.tsx:100-102` needs no change — `pendingTypes` already filters
   `status === "PENDING"`.

## Todo

- [ ] Passage poll predicate
- [ ] Studio poll predicate
- [ ] `ArtifactListItem` failed branch
- [ ] `mapProcessingStatus` exhaustive switch
- [ ] `SourceListItem` failed branch
- [ ] `pnpm typecheck && pnpm lint`

## Success Criteria

- [ ] Manually setting a row to `FAILED` in the DB renders a failed state on both surfaces
- [ ] That row cannot be opened by click, keyboard, or a hand-edited `?passageId=` URL
- [ ] Network panel shows no polling once all rows are `COMPLETED` or `FAILED`
- [ ] Delete works from both the passage dropdown and the artifact dropdown
- [ ] `pnpm typecheck` and `pnpm lint` pass

## Risk Assessment

- **Missed negative check elsewhere.** Mitigation: grep `!== "COMPLETED"` and
  `=== "PENDING"` across `src/` before closing the phase; every hit must be deliberate.
- **Copy implies a retry that does not exist.** Mitigation: failed-state copy names deletion
  as the recovery path, not "try again".
