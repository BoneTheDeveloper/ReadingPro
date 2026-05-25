---
phase: 1
title: "Playwright Install & Config"
status: pending
priority: P1
effort: "1h"
dependencies: []
---

# Phase 1: Playwright Install & Config

## Overview

Install Playwright, create minimal config, validate with one smoke test.

## Related Code Files

- Create: `playwright.config.ts`
- Modify: `package.json` (e2e scripts)
- Modify: `.gitignore`

## Implementation Steps

1. **Install**
   ```bash
   pnpm add -D @playwright/test
   pnpm exec playwright install chromium
   ```

2. **Create `playwright.config.ts`**
   - `testDir: './e2e'`
   - `webServer`: `pnpm dev` for local, `pnpm start` for CI, `reuseExistingServer: !CI`
   - `baseURL: 'http://localhost:3000'`
   - Single project: chromium
   - `trace: 'on-first-retry'`

3. **Create `e2e/` directory**

4. **Add scripts** to `package.json`: `e2e`, `e2e:ui`, `e2e:debug`

5. **Update `.gitignore`**: `.auth/`, `test-results/`, `playwright-report/`

6. **Smoke test** `e2e/smoke.spec.ts` — verify homepage loads

7. **Validate**: `pnpm e2e`

## Success Criteria

- [ ] `pnpm e2e` runs, smoke test passes
- [ ] No conflict with existing Vitest
