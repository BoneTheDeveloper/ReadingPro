# Prisma Migration Flow

Migration workflow across Neon database branches.

## Branch Mapping

| Git Branch      | Neon Branch    | Purpose                    |
| --------------- | -------------- | -------------------------- |
| `feat/*`        | `dev/luc`      | Local development          |
| `development`   | `development`  | Preview / staging          |
| `main`          | `production`   | Production                 |
| `pr-<number>`   | `preview/pr-*` | Ephemeral PR previews      |

## 1. Local Development (`dev/luc`)

Edit the schema, generate migration, test locally.

```
edit schema.prisma
        ↓
pnpm exec prisma migrate dev --name <descriptive_name>
        ↓
test locally
        ↓
commit schema + migration files
```

- `migrate dev` generates SQL, applies it, and updates `_prisma_migrations`.
- Commit both `schema.prisma` and the new `prisma/migrations/` folder.

## 2. Preview / Staging (`development`)

Pull committed code, deploy migration, review the app.

```
pull / merge committed code
        ↓
pnpm exec prisma migrate deploy
        ↓
review the app
```

- `migrate deploy` applies pending migrations without resetting data.
- Requires `DATABASE_URL` pointing to the `development` Neon branch.

## 3. Production (`production`)

Merge to main, deploy migration, production runs on new schema.

```
merge to main / release
        ↓
pnpm exec prisma migrate deploy
        ↓
production app runs on the new schema
```

- Same `migrate deploy` command — no schema drift.
- Requires `DATABASE_URL` pointing to the `production` Neon branch.

## Key Rules

- **Only `migrate dev` on `dev/luc`.** Never on `development` or `production`.
- **Only `migrate deploy` on `development` and `production`.**
- **Commit migration files.** They are the source of truth for all environments.
- **Never edit applied migrations.** Create a new migration to correct issues.
- **Each Neon branch has its own endpoint.** Switch `DATABASE_URL` / `DIRECT_URL` per environment.
