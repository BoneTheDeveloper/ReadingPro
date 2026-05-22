# Phase 2: Hook Tests

## Goal

Test custom hooks with `renderHook` and `act`, focusing on state transitions and side effects rather than UI snapshots.

## Target Files

- `src/features/study/use-study-workspace-state.ts`
- `src/features/study/use-study-actions.ts`
- `src/features/study/use-study-panel-layout.ts`
- `src/components/layout/use-sign-out.ts`

## Work Items

1. Test `useStudyWorkspaceState` initial state, active passage selection, add/update/delete flows, and status/error transitions.
2. Test `useStudyActions` happy paths for upload, simplify, question generation, result insertion, active passage handling, and status cleanup.
3. Test `useStudyActions` error paths for failed server actions, missing active passage, stale active passage refs, and translated fallback messages.
4. Test `useStudyPanelLayout` desktop/mobile behavior by controlling `window.matchMedia` or relevant viewport signals.
5. Test `useSignOut` with mocked Supabase and router behavior, including success and failed sign-out paths.
6. Extend setup mocks only where a hook requires a missing browser API; keep those additions shared and deterministic.

## Verification

- Hook tests use `renderHook` and `act`.
- Tests do not render full page components unless a hook cannot be exercised otherwise.
- `pnpm test` passes after phase completion.

