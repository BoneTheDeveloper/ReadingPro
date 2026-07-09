---
phase: 3
title: "Update Sentry Config - Add pinoIntegration"
status: pending
priority: P1
effort: "30m"
dependencies: []
---

# Phase 3: Update Sentry Config - Add pinoIntegration

## Overview

Add pinoIntegration to both server and edge Sentry configs to consume Pino logs.

## Requirements

- Functional: Pino logs (info/warn) flow into Sentry Logs tab
- Non-functional: error.levels NOT enabled - only selective capture via toHttp/withAction

## Architecture

```typescript
// sentry.server.config.ts - add pinoIntegration
import { pinoIntegration } from "@sentry/pino";

Sentry.init({
  // ... existing config
  integrations: [
    Sentry.consoleLoggingIntegration(),
    Sentry.prismaIntegration(),
    pinoIntegration({
      // Only info/warn logs flow to Sentry
      // Errors handled by toHttp()/withAction() selectively
      logLevels: ["info", "warn"],
    }),
  ],
});
```

## Related Code Files

- Modify: `src/sentry.server.config.ts`
- Modify: `src/sentry.edge.config.ts`

## Implementation Steps

1. Read `src/sentry.server.config.ts` and `src/sentry.edge.config.ts`
2. Add pinoIntegration import (check if @sentry/pino needs install)
3. Add pinoIntegration with logLevels: ["info", "warn"] to both configs
4. Verify package.json has @sentry/pino dependency
5. Run typecheck

## Success Criteria

- [ ] pinoIntegration added to sentry.server.config.ts
- [ ] pinoIntegration added to sentry.edge.config.ts
- [ ] TypeScript compiles without errors
- [ ] Package dependency verified (@sentry/pino)
