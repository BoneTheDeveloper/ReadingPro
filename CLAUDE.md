## Start Here

1. Read `docs/README.md` for the current documentation map.
2. Read `docs/development-guide.md` for the implementation flow — which doc to read first and what comes next for a given task.
3. Read `docs/codebase-summary.md` when you need the source layout or feature map.
4. Read `docs/code-standards.md` for broad code and file placement conventions.
5. Read the most relevant detailed doc before editing code.

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
## Working Rules

- Update docs when a code change alters product behavior, architecture,
  operations, API contracts, database shape, or test expectations.
