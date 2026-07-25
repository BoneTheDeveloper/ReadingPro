## Start Here

1. Read `docs/codebase-summary.md` when you need the source layout or feature map.
2. Read `docs/code-standards.md` for broad code and file placement conventions.
3. Read the most relevant detailed doc before editing code.

## Navigation

- Do not read `node_modules` by default. If package API details are needed,
  inspect `package.json` and the lockfile first, then read only the specific package files required.
- When docs and code disagree, verify against code and ask the user about the conflict.

## Common Checks

Use the smallest relevant verification:

```bash
pnpm typecheck
pnpm lint
pnpm knip
```
## Working Rules

- Update docs when a code change alters product behavior, architecture,
  operations, API contracts, database shape, or test expectations.

## Scree Shots
- Store the playwright screenshot in test-results folder
