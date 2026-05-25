---
phase: 2
title: "Test User & Auth Setup"
status: pending
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 2: Test User & Auth Setup

## Overview

Create test user in Supabase, implement `auth.setup.ts` for Playwright storage state, wire into config. Agents can then run authenticated integration tests.

## Related Code Files

- Create: `e2e/auth.setup.ts`
- Create: `.env.test`
- Create: `e2e/helpers/test-user.ts`
- Modify: `playwright.config.ts` (setup project + storage state)
- Modify: `.gitignore` (`.env.test`)

## Implementation Steps

1. **Create `.env.test`** with `E2E_TEST_USER_EMAIL`, `E2E_TEST_USER_PASSWORD`. Gitignore it.

2. **Create test user in Supabase** (one-time)
   - Script `e2e/helpers/test-user.ts` using Supabase Admin API (`admin.createUser` with `email_confirm: true`)
   - Or manual signup — document both options

3. **Create `e2e/auth.setup.ts`**
   - Read creds from `process.env`
   - Navigate to `/en/sign-in`, fill form, submit
   - Wait for authenticated redirect
   - Save storage state to `.auth/user.json`

4. **Update `playwright.config.ts`**
   - Add `setup` project matching `auth.setup.ts`
   - Add `storageState: '.auth/user.json'` to chromium project
   - `dependencies: ['setup']` on chromium

5. **Validate**: `pnpm e2e --project=setup` signs in, `.auth/user.json` created

## Success Criteria

- [ ] Test user exists in Supabase
- [ ] `auth.setup.ts` signs in and saves storage state
- [ ] `.auth/user.json` contains valid Supabase cookies
- [ ] Agents can use Playwright with authenticated state

## Security

- `.env.test` gitignored, `.auth/` gitignored
- Never use prod credentials
