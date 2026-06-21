# Database Conventions

The Prisma schema in [`schema/`](schema/) is the single
source of truth for tables, columns, types, relations, indexes, cascade rules, and
DB enums — every model carries a `///` docstring. **Do not restate columns here.**

## Identifier Standard

| Identifier kind | PostgreSQL type | Prisma declaration |
|-----------------|-----------------|--------------------|
| Clerk profile ID | `text` | `String @id` |
| Application-owned primary key | `uuid` | `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` |
| Relation/entity-reference ID for app-owned entities | `uuid` | `String @db.Uuid` |
| Relation ID to `profiles.id` | `text` | `String` |
| Product/cache/UI key | `text` | `String` |

Application-owned primary keys, foreign keys, and persisted entity-reference IDs use
native PostgreSQL UUIDs (`gen_random_uuid()`). `profiles.id` stores the Clerk user id
as **text**, so user relations such as `Passage.userId` and `StudyChatMessage.userId`
are text. Product keys such as `cacheKey`, `normalizedText`, `stripeCustomerId`, Blob
pathnames, and question option IDs remain strings. `StudioArtifact.id` is a UUID
supplied by the client, not database-generated. `Question.options` /
`Question.correctOption` hold UI option IDs, not persisted entity identifiers.

## String Columns That Act As Enums

These are plain `String` columns (no DB enum), so their allowed values live in app logic
only and are not enforced by the schema. Catalogued here for reference:

| Column | Values |
|--------|--------|
| `StudyChatMessage.role` | `user`, `assistant` |
| `StudioArtifact.type` | `quiz`, `flashcard` |
| `StudioArtifact.status` | `generating`, `done`, `failed` |
| `Translation*.provider` | `cache`, `dictionary`, `fallback`, `google_translate`, `ai` |
| `VocabularyItem.type` | `WORD`, `PHRASE` |
| `VocabularyItem.status` | `NEW`, `LEARNING`, `MASTERED` |
| `VocabularyItem.source` | `TRANSLATE`, `DICTIONARY` |
| `DictionaryTranslation.status` | `draft`, (reviewed states) |
| `DictionaryAlias.aliasType` | `variant`, ... |
