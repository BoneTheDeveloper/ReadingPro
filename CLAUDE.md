## Start Here

1. Read `docs/README.md` for the current documentation map.
2. Read `docs/codebase-summary.md` when you need the source layout or feature map.
3. Read `docs/code-standards.md` for broad code and file placement conventions.
4. Read the most relevant detailed doc before editing code.

## Task-Specific Docs

Before starting a task in these areas, read its canonical docs first:

- **Database / schema / migrations** → [`prisma/schema-conventions.md`](prisma/schema-conventions.md)
  (identifier policy, string-enum catalog), [`prisma/schema/`](prisma/schema/) (the schema
  source of truth), [`prisma/migrations-guide.md`](prisma/migrations-guide.md), and
  [`prisma/SECURITY.md`](prisma/SECURITY.md) for the DB security model.
- **Testing** → [`docs/Testing/`](docs/Testing/) — strategy, test scenarios, traceability
  matrix, contract tests, and performance benchmarks.



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
