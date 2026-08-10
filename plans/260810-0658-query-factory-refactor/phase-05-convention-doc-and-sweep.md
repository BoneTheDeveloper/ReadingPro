---
title: "Phase 5: Convention Doc and Sweep"
status: complete
priority: P2
dependencies: [3, 4]
---

# Phase 5: Convention Doc and Sweep

## Overview

Make `CLAUDE.md` describe the code that now exists, and run the invariant checks that prove no
feature was left half-converted. `CLAUDE.md` currently documents a structure the repo abandoned
(`queries.ts` at feature root) and helpers that were never built — this phase closes that gap for
the structure section, as Phase 1 did for the error section.

## Requirements

- Functional: none — documentation and verification only.
- Non-functional: `CLAUDE.md`'s "API & Query Structure" matches the shipped tree and naming.
- Non-functional: repo-wide greps prove the old patterns are fully gone.

## Architecture

### What `CLAUDE.md` says vs what will exist

| Documented | Reality after Phases 1-4 |
|---|---|
| `src/features/[feature]/queries.ts` at feature root | `src/features/[feature]/api/queries.ts` |
| "keys + queryOptions (fetcher inline)" | keys live *inside* the `queryOptions` factory; fetching goes through `fetchJson` |
| separate `query-keys.ts` | gone — the `"use client"` barrier that required it is gone |
| `useDeletePassageMutation` | now accurate (was `useDeletePassage`) |
| `fetch*` only in HTTP calls inside `queryFn` | still true, but the call is `fetchJson` |

### Sections to rewrite

**Directory Structure** — replace the tree with the actual one:

```
src/features/[feature]/
├── server/service/           # server-only
├── schema.ts | schema/       # Zod: response models + input schemas (shared)
├── api/
│   ├── queries.ts            # <entity>Queries: queryOptions factories. NO "use client".
│   └── mutations.ts          # use<Verb><Entity>Mutation hooks
├── hook/                     # client state + orchestration only (no server state)
└── component/
```

**Conventions** — add the rules this refactor established:

- Query keys are defined once, inside the `queryOptions` factory. Read them as
  `<entity>Queries.<x>().queryKey`. Never redefine a key inline; never add a `query-keys.ts`.
- `api/queries.ts` must not carry `"use client"` — RSCs import it for prefetch keys.
- RSC prefetch overrides `queryFn` with an **explicitly annotated** return type so a service
  shape drift is a compile error:
  `queryFn: (): Promise<PassageListItem[]> => listPassagesForUser(id)`.
- Every `queryFn`/`mutationFn` goes through `fetchJson(url, schema, init)`. No bare `res.ok` checks.
- Mutations stay as `use<Verb><Entity>Mutation` hooks, not `mutationOptions` factories — they
  need `useQueryClient()` for cache writes. Revisit only if `useIsMutating` is ever needed.
- Disabled queries use `<skipToken | enabled>` — record whichever Phase 2 chose, and use it
  everywhere.
- `api/` holds server state; `hook/` holds client state. A `useState` in an `api/` module is a
  smell that a wrapper is duplicating what `useMutation`/`useQuery` already returns.

Keep the Transport, Error Handling, and Render Boundaries sections as they are, except for the
Phase 1 edits.

## Related Code Files

- Modify: `CLAUDE.md` (API & Query Structure section)
- Read-only: all `src/features/*/api/**`

## Implementation Steps

1. Rewrite `CLAUDE.md` → "API & Query Structure" per the sketch above. Fold the naming table's
   Mutation row into the new Conventions list rather than stating the rule twice.
2. Run the invariant greps and confirm each returns nothing:
   - `rg "query-keys" src/` — no such module remains
   - `rg 'if \(!res\.ok\)' src/features/` — all fetchers use `fetchJson`
   - `rg '"use client"' src/features/*/api/queries.ts` — factories stay RSC-importable
   - `rg 'Keys\.' src/` — no bare key-object access survives
   - `rg 'useState' src/features/*/api/` — no client state in transport modules
3. Run `pnpm typecheck && pnpm lint && pnpm knip` on the full tree.
4. Full manual smoke across all four features (the union of Phases 2-4 smoke steps) in one
   session, on a fresh page load.

## Todo

- [x] `CLAUDE.md` "API & Query Structure" rewritten
- [x] All five invariant greps return empty
- [x] `pnpm typecheck && pnpm lint && pnpm knip` pass on the full tree
- [x] Full manual smoke passed

## Success Criteria

- [x] A reader following `CLAUDE.md` alone would produce code matching what is in `src/`
- [x] Every invariant grep in Step 2 returns no results
- [x] `pnpm knip` reports no newly-dead exports introduced by the refactor
- [x] Manual: upload → read → translate → save word → generate questions → answer → delete
      passage, all on one page load without a console error

## Risk Assessment

- **Doc drift recurring.** The root cause was a structural move (`queries.ts` → `api/`) landing
  without a doc update. The invariant greps in Step 2 are cheap enough to re-run in review; if
  drift recurs, promote them to a lint rule rather than a longer doc.
- **Grep false-negatives.** `rg 'Keys\.'` will also match unrelated identifiers; read the hits
  rather than trusting an empty exit code from a mistyped pattern.
- **Scope creep into the deferred error UI.** `<ErrorState />` and toasts are explicitly out of
  scope. If the manual smoke surfaces a bad error UX, file it — do not fix it here.
