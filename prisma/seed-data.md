## Current Source Status

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
| `pnpm db:seed:dictionary:bulk:dev` | Fast development-only bulk replace of dictionary data from committed source files. |
| `pnpm db:validate:dictionary` | Validate dictionary source files. |
| `pnpm db:check:dictionary-seed` | Read-only dictionary seed status check for configured database. |
