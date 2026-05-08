---
title: "Phase 6: Verify build + test"
phase: 6
status: pending
effort: 30m
---

## Overview

Run build, lint, and type-check. Grep audit for any remaining references to removed code. Verify app starts and connects to DB.

## Verification Steps

### 1. Type check

```bash
npx tsc --noEmit
```

Catch any remaining type errors from API signature changes.

### 2. Build

```bash
npm run build
```

Full Next.js build. Must pass with zero errors.

### 3. Lint

```bash
npm run lint
```

### 4. Grep audit — no leftover references

Run these and confirm zero results in `src/`:

```bash
grep -r "withUserContext" src/
grep -r "user-scoped-client" src/
grep -r "ScopedClient" src/
grep -r "@prisma/adapter-pg" src/
grep -r "from 'pg'" src/
grep -r "from 'dotenv'" src/
grep -r "DB_USER\|DB_PASSWORD\|DB_HOST\|DB_PORT\|DB_NAME" src/
```

### 5. Verify `client.ts` is minimal

```bash
wc -l src/lib/db/client.ts
# Should be ~10 lines
```

### 6. Verify no stale dependencies

```bash
grep -E "adapter-pg|\"pg\"|\"dotenv\"" package.json
# Should return nothing
```

### 7. Manual smoke test (dev server)

```bash
npm run dev
```

- Load app in browser
- Log in
- Navigate to study page (triggers passage read)
- Verify no DB connection errors in terminal

### 8. Prisma schema validate

```bash
npx prisma validate
```

## Success Criteria

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Zero grep hits for removed code in `src/`
- [ ] `client.ts` is ~10 lines
- [ ] No stale deps in `package.json`
- [ ] Dev server starts and connects to DB
- [ ] `prisma validate` passes
