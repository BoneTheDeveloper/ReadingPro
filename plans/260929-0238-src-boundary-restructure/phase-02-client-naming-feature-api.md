---
phase: 2
title: "Client naming and feature APIs"
status: pending
priority: P2
effort: "2h"
dependencies: [1]
---

# Phase 2: Client naming and feature APIs

## Goal

Give the client one naming convention (plural folders, `lib/` for helpers) and
a public `index.ts` per feature, so routes and other features import through a
single entry point.

## Context

Current inconsistencies under `src/client/`:
- `component/` (and shadcn's `components.json` already points at `@/components`, which does not exist).
- `features/*/component/`, `features/*/hook/`, `features/passage/util/`, `features/reading/utils/`.
- `features/passage/component/model/` holds modal and input components for upload (`upload-modal.tsx`, `upload-zone.tsx`, `paste-text-input-area.tsx`, `youtube-input.tsx`).
- `component/auth/` (`login-form.tsx`) is domain code sitting in the shared component folder; `component/layout/auth-controls.tsx` is auth UI too.

## Files to Create / Modify

- Move: `src/client/component/` → `src/client/components/`
- Move: `src/client/component/auth/login-form.tsx` → `src/client/features/auth/components/login-form.tsx`
- Move: `src/client/components/layout/auth-controls.tsx` → `src/client/features/auth/components/auth-controls.tsx`
- Move: `src/client/features/*/component/` → `components/`; `hook/` → `hooks/`; `util/` and `utils/` → `lib/`
- Move: `src/client/features/passage/components/model/` → `components/upload/`
- Create: `src/client/features/{auth,passage,reading,studio,vocabulary}/index.ts`
- Modify: `components.json` aliases (`components` → `@/client/components`, `ui` → `@/client/components/ui`, `utils` → `@/client/lib/utils`, `lib` → `@/client/lib`, `hooks` → `@/client/hooks`)
- Modify: all importers of the moved paths, `README.md` client map

## Tasks & Steps

- [ ] Do the `git mv` operations above.
- [ ] Rewrite imports: `@/client/component/` → `@/client/components/`, then per-feature `/component/` → `/components/`, `/hook/` → `/hooks/`, `/util/` and `/utils/` → `/lib/`, `components/model/` → `components/upload/`, and the two auth files. Fix relative imports (`./`, `../`) inside moved folders; `pnpm typecheck` lists any missed.
- [ ] Create each feature `index.ts` exporting only what is used outside the feature today. Find that set with `git grep -n "@/client/features/<x>/" src/client | grep -v "src/client/features/<x>/"`.
- [ ] Rewrite those cross-feature and route imports to `@/client/features/<x>`.
- [ ] Add an ESLint rule for `src/client/**` that forbids deep imports into another feature: pattern group `["@/client/features/*/*"]` with message "Import a feature through its index.ts". Files inside a feature import their own files relatively, so the rule does not block them. If a feature must deep-import its own files by alias, convert those to relative imports.
- [ ] Update `components.json` aliases and the README client map.
- [ ] Commit: `refactor: unify client folder names and add feature entry points`.

## Verification

- `pnpm typecheck && pnpm lint && pnpm build && pnpm exec knip` pass (knip flags unused exports in new `index.ts` files; remove any it reports).
- `find src/client -type d \( -name component -o -name hook -o -name util -o -name utils -o -name model \)` prints nothing.
- `git grep -nE "@/client/features/[a-z-]+/" src/client/routes` returns nothing.
- `pnpm dlx shadcn@latest add --dry-run badge` (or `view`) resolves to `src/client/components/ui`. Skip if the CLI needs network and is unavailable; confirm aliases by reading `components.json` instead.
- Smoke: login, `/study` with passage list, `/vocabulary`, `/account` render.

## Risk and Rollback

- Risk: the feature-index rule may create import cycles through `index.ts` (feature A index → feature B index → A). `pnpm build` warnings or runtime `undefined` imports reveal this; resolve by importing the specific module relatively within the feature.
- Rollback: revert the phase commit.
