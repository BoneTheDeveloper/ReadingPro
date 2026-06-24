# Prisma Migration Guide

Single source of truth for changing the database schema. Solo-dev flow on Neon +
Prisma 7. 
## Mental Model

| Context | Neon branch | Env file | Command 
|---|---|---|---|
| Local dev | `development` | `.env.local` | `pnpm db:migrate:dev` 


`prisma.config.ts` loads `.env.local` by default. The `:prod` scripts set
`PRISMA_ENV_FILE=.env.prod` so the same CLI points at the production branch.

## 1. Dev Schema Change

1. Edit the relevant domain file under `prisma/schema/` (multi-file schema).
2. Format and validate:

   ```bash
   pnpm exec prisma format
   pnpm exec prisma validate
   ```

3. Create and apply the migration to `development`:

   ```bash
   pnpm db:migrate:dev --name <verb>_<noun>   # e.g. add_reading_goal
   ```

4. Review the generated SQL in `prisma/migrations/`.
5. Run local checks:

   ```bash
   pnpm run db:generate
   pnpm run typecheck
   pnpm run lint
   pnpm run test
   ```

6. Commit the changed `prisma/schema/*.prisma` file(s) and the new `prisma/migrations/*` folder.

Rules:

- Commit every generated migration folder.
- Do not edit a migration after it has been applied to any shared database.
- If `prisma/migrations/` has a git conflict, resolve by re-running
  `migrate dev` on `development`. Never hand-edit migration SQL to fix conflicts.
```

## 3. Reset And Baseline

### Development reset (deletes all dev data — never on production)

```bash
pnpm exec prisma migrate reset --force
pnpm run db:generate
pnpm db:seed:dictionary:bulk:dev```
