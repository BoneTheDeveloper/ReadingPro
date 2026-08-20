---
phase: 1
title: "Setup: Install Workflow SDK + Configure Next.js"
status: pending
priority: P1
effort: "30m"
dependencies: []
---

# Phase 1: Setup

## Overview

Install the Vercel Workflow SDK package and update `next.config.ts` to enable workflow support.

## Requirements

- Functional: Install workflow package
- Functional: Wrap Next.js config with `withWorkflow`
- Non-functional: Existing Sentry config must continue to work

## Architecture

```typescript
// next.config.ts (modified)
import { withWorkflow } from "workflow/next";
import { withSentryConfig } from "@sentry/nextjs";

// Wrap withWorkflow first, then Sentry
export default withSentryConfig(
  withWorkflow(nextConfig),
  { ... }
);
```

## Related Code Files

- Modify: `next.config.ts`
- Modify: `package.json` (add dependency)

## Implementation Steps

1. **Verify workflow package** (already installed)
   ```bash
   pnpm add workflow  # or verify it's in package.json
   ```
   
   Package name: `workflow` (from `@workflow/core`)

2. **Update `next.config.ts`**
   - Import `withWorkflow` from `workflow/next`
   - Wrap the exported config: `withWorkflow(withSentryConfig(nextConfig, {...}))`

3. **Verify installation**
   ```bash
   pnpm typecheck
   ```

## Success Criteria

- [ ] `workflow` package verified in `package.json`
- [ ] `next.config.ts` uses `withWorkflow` from `workflow/next`
- [ ] Typecheck passes
- [ ] Dev server starts without errors

## Risk Assessment

- **Risk**: Sentry config order matters (withSentryConfig must wrap withWorkflow)
  - **Mitigation**: Order is `withSentryConfig(withWorkflow(config))` — withWorkflow wraps Next.js, Sentry wraps everything
