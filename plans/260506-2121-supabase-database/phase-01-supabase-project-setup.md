---
title: "Phase 01: Supabase Project Setup"
description: "Create Supabase project, configure CLI, set up environment variables"
status: pending
priority: P1
effort: 1h
branch: feature/supabase-database
---

## Context Links

- Issue: https://github.com/BoneTheDeveloper/english-reading-training-app/issues/23
- `.env.example` — current env var template
- `package.json` — dependency management

## Overview

Create a Supabase project, install the CLI, configure environment variables for both local development and remote connection. This phase produces no application code changes — only infrastructure and configuration.

## Key Insights

- Current `.env.example` has `DATABASE_URL=file:./prisma/dev.db` — needs PostgreSQL connection string
- Supabase provides two connection modes: direct (port 5432) and pooled (port 6543 via pgBouncer)
- Prisma migrations require direct connection; app queries should use pooled connection
- Supabase project URL and anon/service_role keys needed for Storage API
- CLI enables local dev with `supabase start` (runs PostgreSQL in Docker)

## Requirements

### Functional
- Supabase project created on Supabase dashboard
- Supabase CLI installed and initialized (`supabase init`)
- Local dev environment working (`supabase start`)
- Environment variables configured for both local and remote

### Non-Functional
- Service role key never committed to git
- `.env.example` updated with all new vars (placeholder values)
- `.gitignore` updated to exclude `.env.local` and `supabase/.temp/`

## Related Code Files

| File | Action |
|------|--------|
| `.env.example` | Modify — add Supabase vars |
| `.env.local` | Modify — add actual credentials (gitignored) |
| `.gitignore` | Modify — add supabase temp dirs |
| `supabase/config.toml` | Create — Supabase CLI config |
| `package.json` | Modify — add `supabase` as devDependency |

## Implementation Steps

1. **Install Supabase CLI**
   ```bash
   npx supabase init
   ```
   This creates `supabase/` directory with `config.toml`.

2. **Add Supabase JS client dependency**
   ```bash
   npm install @supabase/supabase-js
   npm install -D supabase
   ```

3. **Create Supabase project** (if not already created)
   - Go to https://supabase.com/dashboard
   - Create new project
   - Note: Project ID, region, database password

4. **Link local project to remote**
   ```bash
   npx supabase link --project-ref <project-id>
   ```

5. **Update `.env.example`**
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

   # Database (Direct — for Prisma migrations)
   DIRECT_URL=postgresql://postgres:[password]@db.<project>.supabase.co:5432/postgres

   # Database (Pooled — for app queries via pgBouncer)
   DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

6. **Update `.env.local`** with actual values from Supabase dashboard > Settings > API and Settings > Database.

7. **Update `.gitignore`**
   ```
   # Supabase
   supabase/.temp/
   ```

8. **Verify local dev stack**
   ```bash
   npx supabase start
   ```
   Confirm PostgreSQL, Studio, and API endpoints are running.

## Todo List

- [ ] Install Supabase CLI and initialize project
- [ ] Install `@supabase/supabase-js` client dependency
- [ ] Create Supabase project on dashboard (or use existing)
- [ ] Link local to remote project
- [ ] Update `.env.example` with all new vars
- [ ] Update `.env.local` with actual credentials
- [ ] Update `.gitignore`
- [ ] Verify `supabase start` works locally

## Success Criteria

- [ ] `supabase status` shows all services running
- [ ] `.env.example` has all Supabase vars with placeholder descriptions
- [ ] `.env.local` has actual credentials (not committed)
- [ ] `@supabase/supabase-js` in `package.json` dependencies
- [ ] `supabase` CLI in `package.json` devDependencies

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Supabase CLI version mismatch | Low | Low | Pin version in package.json |
| Docker not running for local dev | Medium | Low | Document requirement; remote DB works as fallback |
| Credentials leak in git | Low | Critical | `.gitignore` + pre-commit hook verification |

## Security Considerations

- `SUPABASE_SERVICE_ROLE_KEY` has full DB access — MUST stay in `.env.local`, never committed
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe for client-side (RLS restricts access)
- `NEXT_PUBLIC_SUPABASE_URL` is public-facing, safe to expose
- Database password must be strong (Supabase generates one)

## Next Steps

- Unblocks Phase 02 (Prisma migration) and Phase 04 (Storage migration) in parallel
