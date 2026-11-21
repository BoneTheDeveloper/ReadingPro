# Verification report: Prisma to raw SQL with Flyway

Date: 2026-11-21. Branch `bone/refactor/prisma-to-raw-sql`.

Environment: Postgres `17.12-alpine` and Flyway `11.20.3-alpine` from
`compose.yaml`. The agent shell cannot use `/var/run/docker.sock`, so every
`pnpm db:*` command ran unchanged through a rootless Podman API socket
(`DOCKER_HOST`). `.env` still points at the Neon database. Tests and the server
smoke run used `DATABASE_URL=postgres://readingpro:readingpro@localhost:54329/readingpro`
as an override, so the Neon database was never touched.

## Acceptance criteria

| # | Criterion | Result |
|---|---|---|
| 1 | Auth and every feature work on the Docker DB | **Met for DB-backed behavior.** 45 integration tests pass, and an HTTP smoke run against the production build passed (below). The flows that need Google OAuth or AI calls are still on the manual checklist. |
| 2 | No Prisma traces | **Met with one documented exception.** `git grep -Ii prisma -- ':!plans' ':!pnpm-lock.yaml'` lists only `pnpm-workspace.yaml` (`"@prisma/engines": false`, `prisma: false`), and `pnpm why` still lists `prisma` and `@prisma/client`. See "Remaining Prisma packages". |
| 3 | SQL only in repositories | **Met.** See "Layer check". |
| 4 | Docker Postgres and Flyway work from an empty volume | **Met.** See "Clean rebuild". |

## Trace check

- Deleted: `prisma/`, `prisma.config.ts`, `src/server/lib/prisma.ts`, the local `src/server/db/generated/`, `src/server/lib/enum-sync.ts`.
- `package.json` no longer has `@prisma/client`, `@prisma/adapter-pg`, `prisma`, `postinstall` or `db:generate`. `build` is `pnpm build:web && pnpm build:api`.
- `.gitignore` and `eslint.config.mjs` no longer list `src/server/db/generated`.
- `.github/workflows/ci.yml` no longer runs `pnpm exec prisma generate`. The plan missed this file; without the fix, CI would have failed on the missing binary.
- The lockfile change only removes packages (`@prisma/adapter-pg`, `@prisma/driver-adapter-utils`, `postgres-array`) and marks some packages `optional: true`. No other package version changed.

### Remaining Prisma packages

`better-auth@1.7.6` and its fixed dependency `@better-auth/prisma-adapter@1.7.6`
declare `prisma` and `@prisma/client` as **optional** peers. pnpm keeps those
peers resolved from the existing lockfile, so `pnpm why prisma @prisma/client`
still lists them, and only under `better-auth`. The app does not declare,
import or build them. Their install scripts are disabled in
`pnpm-workspace.yaml` (`allowBuilds: false`); pnpm adds placeholders there
whenever these entries are missing.

Tried on copies of the lockfile, none applied:
- `pnpm dedupe`: keeps them.
- `pnpm update better-auth`: keeps them and bumps better-auth to 1.7.26.
- A temporary `overrides: "-"`: keeps them.
- Deleting the Prisma entries by hand: pnpm leaves inconsistent peer suffixes behind.
- A fully fresh lockfile drops them, but changes several hundred unrelated package versions (466 removed and 317 added entries, including `ai`, `better-auth` and Babel).

## Layer check

- `@/server/lib/db` is imported by the repositories, `profile-repository.ts`, `auth.ts`, the test helpers in `src/server/test/` and the `*.test.ts` files. The other importers are `default-vocabulary-set.ts` and the three vocabulary services, which import only `withTransaction` and `isUniqueViolation`.
- No `*-service.ts` file contains `SELECT`, `INSERT`, `UPDATE` or `DELETE`.
- `grep -rln AppError src/server/modules/*/*-repository.ts` finds nothing.
- `grep -rn prisma src/server/modules` finds nothing.

## Clean rebuild

`pnpm db:down -v && pnpm db:up && pnpm db:migrate && pnpm db:info`:

```
Successfully applied 1 migration to schema "public", now at version v1
| Versioned | 1 | init | SQL | 2026-11-21 04:30:24 | Success | No |
```

## Full gate

| Command | Result |
|---|---|
| `pnpm typecheck` | pass |
| `pnpm lint` | pass |
| `pnpm exec knip` | pass (no findings) |
| `pnpm test` | 9 files, 45 tests pass; afterwards there are 0 `@test.invalid` users |
| `pnpm build` | pass (`.output` 5.93 MB) |

## Server smoke run (production build, local DB)

`node .output/server/index.mjs` with `NODE_ENV=production`, using a Pro test
user and a session cookie signed with better-call's `serializeSignedCookie`.
The test user was deleted afterwards.

- `GET /api/auth/get-session` returned the session. Better Auth refreshed `expiresAt` through the Kysely adapter.
- Passage list and get returned 200.
- Saving a word twice returned `savedCount` 1, then 2. Stats returned 200.
- Set create, rename (`dailyNewLimit`), generate (Pro), list and delete all worked.
- Due cards returned `passage` as `{ id, title }` or `null`.
- Session start, rate, resent rate (`cardsReviewed` stays 1) and end all worked.
- Chat history and artifact list returned 200.
- Deleting a missing passage or artifact returned **404** `passage.not_found` / `artifact.not_found`.

## Manual smoke checklist (needs the user)

These need Google OAuth in a browser or live AI calls, so the agent did not run them:

- [ ] Sign in with Google, sign out, sign in again
- [ ] Import a TEXT passage, a PDF passage and a YouTube passage; each reaches `COMPLETED` and shows its CEFR level
- [ ] Delete a passage
- [ ] Generate a QUESTION artifact and a FLASHCARD artifact; save progress and reload
- [ ] Send a chat message, reload to see the history, then clear it
- [ ] Translate a selection and save the word; save it again (count goes up)
- [ ] Create, rename, generate (Pro only) and delete a set; the words return to the default set
- [ ] Start a review, rate cards, end the review; the due and new counts update

## Behavior changes

- Deleting or updating a missing passage, artifact or vocabulary set now returns 404 with the module's `*.not_found` reason. Before, Prisma's `P2025` returned a 500.
- A passage or artifact deleted while its workflow runs still fails the workflow step, now with `*.not_found` instead of `P2025`.
- Timestamps are `timestamptz`, and `ProcessingStatus` labels are uppercase in the DB.

## Production database (not run)

Waiting for explicit confirmation. First take a `pg_dump` backup of the
production database. Then run the following against an **empty** database:

```
docker run --rm -v "$PWD/db/migrations:/flyway/sql:ro,z" flyway/flyway:11.20.3-alpine \
  -url="jdbc:postgresql://<host>:5432/<db>?sslmode=require" -user=<user> -password=<password> migrate
```

Then update `DATABASE_URL` in Vercel if the database changed.
