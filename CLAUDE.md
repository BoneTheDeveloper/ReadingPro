## Start Here

1. Read `docs/README.md` for the current documentation map.
2. Read `docs/codebase-summary.md` when you need the source layout or feature map.
3. Read `docs/code-standards.md` for broad code and file placement conventions.
4. Read the most relevant detailed domain doc before editing code.

If a task needs exact files, search within the relevant docs folder first, then search source with `rg`.

## Working Rules

- Prefer canonical docs over stale memory or inferred behavior.
- Keep `docs/code-standards.md` broad; put detailed rules beside the files or folders they govern.
- Update docs when a code change alters product behavior, architecture,
  operations, API contracts, database shape, or test expectations.

## Navigation

- Prefer `rg` and `rg --files` for text and file discovery.
- Do not read `node_modules` by default. If package API details are needed,
  inspect `package.json` and the lockfile first, then read only the specific package files required.
- When docs and code disagree, verify against code and ask the user about the conflict.

## Common Checks

Use the smallest relevant verification:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
```
