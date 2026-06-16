# Database Architecture

## Provider

The app uses Neon PostgreSQL through Prisma 7. The Prisma client is generated into `src/generated/prisma`.

## Connections

| Variable | Use |
|----------|-----|
| `DATABASE_URL` | Runtime pooled connection used by the app. |
| `DIRECT_URL` | Direct connection for migrations in local/trusted CI only. |

Runtime code must not use `DIRECT_URL`.

## Model Groups

| Group | Models |
|-------|--------|
| Identity | `UserProfile` |
| Reading content | `Passage`, `Question` |
| Study/review | `StudySession`, `StudioArtifact`, `QuizResult`, `CardReview`, `StudyChatMessage` |
| Translation/vocabulary | `TranslationCache`, `TranslationHistory`, `VocabularyItem` |
| Dictionary | `DictionaryEntry`, `DictionarySense`, `DictionaryTranslation`, `DictionaryAlias`, `DictionarySourceAudit` |
| Storage intents | `FileUploadIntent` |

## Data Access Layers

- General app queries live under `src/lib/db/*-queries.ts`.
- Dictionary repositories live under `src/lib/dictionary/**/repository.ts`.
- Services compose repositories and DTO builders.
- Route handlers and components should not construct raw database queries directly.

## Migrations

Migration SQL is stored under `prisma/migrations/`. Production migrations should be deployed with `pnpm db:migrate:deploy` after preview verification and before production traffic depends on the schema.

## Branch Contract

See [../Database/neon-environment-contract.md](../Database/neon-environment-contract.md). Development, preview, and production must use separate Neon contexts/branches.
