---
title: "Pino primary + selective Sentry capture"
description: "Refactor to use Pino as primary logger, add pinoIntegration to Sentry, remove manual Sentry calls from 18 files"
status: pending
priority: P2
branch: "preview"
tags: ["observability", "sentry", "pino", "refactor"]
blockedBy: []
blocks: []
created: "2026-07-09T03:32:26.546Z"
createdBy: "ck:plan"
source: skill
---

# Pino primary + selective Sentry capture

## Overview

Implement hybrid observability model: Pino as primary logger, Sentry consumes Pino logs + creates Issues selectively via centralized error boundaries (toHttp for routes, withAction for server actions).

## Architecture

```
Code → Pino Logger → Console (dev) + Sentry Logs (prod)
              ↓
        toHttp() / withAction() → Sentry Issues (selective)
```

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Setup](./phase-01-setup.md) | Pending |
| 2 | [Create-withAction](./phase-02-create-withaction.md) | Pending |
| 3 | [Update-Sentry-Config](./phase-03-update-sentry-config.md) | Pending |
| 4 | [Remove-manual-Sentry](./phase-04-remove-manual-sentry.md) | Pending |
| 5 | [Update-docs](./phase-05-update-docs.md) | Pending |

## Dependencies

<!-- Cross-plan dependencies -->
None - this is a self-contained refactor
