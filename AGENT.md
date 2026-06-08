# Agent Guide

Lightweight instructions for agents working in this repo. Keep this file short:
it should explain how to navigate the project, not duplicate the source tree or
the detailed docs.

## Start Here

1. Read `docs/README.md` for the current documentation map.
2. Read `docs/codebase-summary.md` when you need a source layout overview.
3. Read the most relevant domain doc before editing code.

## Documentation Map

Use the docs structure instead of adding long path lists here:

- `docs/Product/` - scope, user flows, use cases, and product assumptions.
- `docs/Architecture/` - runtime, auth, database, storage, API, deployment, and system design.
- `docs/Flows/` - end-to-end feature behavior.
- `docs/API/` - API conventions, route inventory, and route-specific notes.
- `docs/database/` - schema shape, ERD, migration notes, and data contracts.
- `docs/Testing/` - unit, integration, e2e, performance, and contract test expectations.
- `docs/Operations/` - local setup, environment, deployment, debugging, migrations, and security.
- `docs/ADR/` - architecture decision records.
- `docs/Design/`, `docs/Sentry/`, and `docs/journals/` - supporting notes.

If a task needs exact files, search within the relevant docs folder first, then
search source with `rg`.

## Working Rules

- Do not turn `AGENT.md` into a source path index.
- Prefer canonical docs over stale memory or inferred behavior.
- Keep detailed rules beside the files or folders they govern.
- Update docs when a code change alters product behavior, architecture,
  operations, API contracts, database shape, or test expectations.
- Preserve existing user changes in the worktree unless the user explicitly asks
  you to revert them.

## Navigation

- Prefer `rg` and `rg --files` for text and file discovery.
- Do not read `node_modules` by default. If package API details are needed,
  inspect `package.json` and the lockfile first, then read only the specific
  package files required.
- When docs and code disagree, verify against code and update the stale doc if
  it is in scope for the task.

## Common Checks

Use the smallest relevant verification:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
```
