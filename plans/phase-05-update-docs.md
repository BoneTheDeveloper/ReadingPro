---
phase: 5
title: "Update Documentation"
status: pending
priority: P2
effort: "30m"
dependencies: [1, 2, 3, 4]
---

# Phase 5: Update Documentation

## Overview

Update observability.md to reflect the new hybrid model.

## Requirements

- Functional: Document new architecture, withAction(), pinoIntegration
- Non-functional: Keep it concise and accurate

## Architecture Changes to Document

### New: withAction() HOF
- Purpose: Wrap server actions with scoped logger + Sentry span + selective capture
- Usage: `withAction("action.name", async (ctx, ...args) => { ... })`

### New: pinoIntegration
- Consumes Pino logs into Sentry Logs tab
- logLevels: ["info", "warn"] - errors handled by toHttp/withAction

### Updated Error Handling
- Route errors → toHttp() → Sentry Issue (selective)
- Server Action errors → withAction() → Sentry Issue (selective)
- All logs → Pino → Sentry Logs (via pinoIntegration)

## Related Code Files

- Modify: `docs/Architecture/observability.md`

## Implementation Steps

1. Read current `docs/Architecture/observability.md`
2. Update architecture diagram
3. Add section for withAction() HOF
4. Update Sentry configuration section with pinoIntegration
5. Update error handling section to reflect selective capture
6. Add note about what auto-captures vs selective capture

## Success Criteria

- [ ] observability.md updated with new architecture
- [ ] withAction() usage documented
- [ ] pinoIntegration configuration documented
- [ ] Error handling flow clearly explained
- [ ] No broken links or outdated info
