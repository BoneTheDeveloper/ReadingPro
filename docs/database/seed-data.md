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

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm db:seed:dictionary` | Seed/import dictionary data. |
| `pnpm db:validate:dictionary` | Validate dictionary source files. |
| `pnpm db:normalize:dictionary` | Normalize dictionary data. |
| `pnpm db:import:dictionary` | Import dictionary data. |
| `pnpm db:generate:benchmark` | Generate benchmark seed data. |

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

