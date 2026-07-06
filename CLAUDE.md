## Start Here

1. Read `docs/docs-index.md` for the current documentation map.
2. Read `docs/codebase-summary.md` when you need the source layout or feature map.
3. Read `docs/code-standards.md` for broad code and file placement conventions.
4. Read the most relevant detailed doc before editing code.

## Navigation

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
## Working Rules

- Update docs when a code change alters product behavior, architecture,
  operations, API contracts, database shape, or test expectations.
