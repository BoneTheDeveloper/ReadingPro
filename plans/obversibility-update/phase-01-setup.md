---
phase: 1
title: "Setup - Add AppError to logger.ts"
status: completed
priority: P1
effort: "30m"
dependencies: []
---

# Phase 1: Setup - Add AppError to logger.ts

## Overview

> **STATUS: DONE** — already at `src/lib/logger.ts:27-33` (`AppError`, `isOperational=true`, exported L256). Verify only.

Add AppError base class to logger.ts for use in withAction() to distinguish business errors from unexpected errors.

## Requirements

- Functional: Export AppError class with `isOperational` flag
- Non-functional: Keep minimal, no additional dependencies

## Architecture

```typescript
// AppError enables withAction() to distinguish:
// - Operational errors (business logic): warn only, no Sentry Issue
// - Unexpected errors: error + Sentry Issue
export class AppError extends Error {
  isOperational: boolean = true;
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}
```

## Related Code Files

- Modify: `src/lib/logger.ts` - add AppError class and export

## Implementation Steps

1. Read `src/lib/logger.ts` to find the best location for AppError
2. Add AppError class with `isOperational = true`
3. Export AppError from the module

## Success Criteria

- [ ] AppError exported from `@/lib/logger`
- [ ] Can import and use in withAction()
- [ ] TypeScript compiles without errors
