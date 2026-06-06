# Seed Data

## Dictionary Data

Dictionary seed inputs live under:

```text
prisma/data/dictionary/en-vi/
  entries.json
  aliases.json
  senses.json
  translations.json
  fixtures/
```

The seed script is `prisma/seed.ts`.

## Current Source Status

The committed normalized seed source currently contains:

| File | Rows |
|------|------|
| `entries.json` | 1009 |
| `senses.json` | 1009 |
| `translations.json` | 1009 |
| `aliases.json` | 1614 |

Current source shape:

- Source language: `en`
- Target language: `vi`
- Translation status: `reviewed`
- Translation source type: `seed`
- Translation source name: `seed-common-1000`
- Alias type: `inflection`

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm db:seed:dictionary` | Seed/import dictionary data. |
| `pnpm db:validate:dictionary` | Validate dictionary source files. |
| `pnpm db:check:dictionary-seed` | Read-only dictionary seed status check for configured database. |
| `pnpm db:generate:benchmark` | Generate benchmark seed data. |

## Seed Check Rule

Use separate gates for source validation, remote status, and mutating seed/import:

| Context | Source validation | Remote seed status | Mutating seed/import |
|---------|-------------------|--------------------|----------------------|
| PR CI | Run `pnpm db:validate:dictionary`. | Do not run; no DB secrets. | Do not run. |
| Local | Run before seed-related work. | Run against the configured local/development database when seed status matters. | Development database only. |
| Preview | Run before deploy or migration verification. | Run read-only after deploy or migration. | Approval-only trusted job. |
| Production | Run before protected release verification. | Run read-only in protected deploy/migration workflow. | Explicit approval only in a trusted production job. |

Remote seed status checks must use only `SELECT` queries. They should report dictionary table counts, language/status/source distributions, audit batch status, and representative exact/alias/miss lookup samples. They must not create, update, delete, or reseed data.

`pnpm db:validate:dictionary` is the source-quality gate. It is file-only and validates cross-file references, supported `en -> vi` language shape, normalized headwords and aliases, ranks, primary translations, allowed statuses/source labels, and duplicate keys before import.

`pnpm db:check:dictionary-seed` is the remote-status gate. It connects to the configured database and reports read-only counts, distributions, audit batches, and samples. Count mismatches or unexpected distributions should stop the workflow for review before any mutating seed/import command runs.

## Tables

- `DictionaryEntry`
- `DictionarySense`
- `DictionaryTranslation`
- `DictionaryAlias`
- `DictionarySourceAudit`

## Rules

- Keep dictionary seed data deterministic.
- Validate normalized headwords and aliases before import.
- Keep benchmark fixtures separate from production-quality seed data.
- Do not seed user-owned study data into production.
- Treat remote seed checks as read-only health checks; run mutating seed/import only after explicit approval.
- Do not use `prisma/seed.ts` as normal test setup; route tests and benchmarks should use mocks or isolated temporary fixtures.
