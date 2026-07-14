---
title: Upload Service Reorganization
description: >-
  Reorganize upload feature to use service-based architecture with placeholder
  services for AI analysis, matching the target architecture defined in
  upload-ai-architecture.md
status: completed
priority: P2
branch: preview
tags:
  - upload
  - architecture
  - refactor
  - services
blockedBy: []
blocks: []
created: '2026-07-14T13:37:54.905Z'
createdBy: ck-cli
source: cli
---

# Upload Service Reorganization

## Overview

Reorganize the upload feature to match the target service architecture defined in `docs/Flow/upload/upload-ai-architecture.md`. Create placeholder services for unimplemented AI analysis features, and refactor the Inngest worker to use a pipeline orchestrator pattern.

**Current state:**
- Inline processing logic in Inngest worker (`process-upload.ts`)
- No dedicated service layer for upload processing
- Hardcoded CEFR level (`"B2"`) directly in worker

**Target state:**
- `services/` directory with normalizers and analyzers
- Pipeline orchestrator (`upload-processor.service.ts`)
- Placeholder services ready for real AI implementation

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Setup-Services-Structure](./phase-01-setup-services-structure.md) | Completed |
| 2 | [Create-Placeholder-Services](./phase-02-create-placeholder-services.md) | Completed |
| 3 | [Create-Pipeline-Orchestrator](./phase-03-create-pipeline-orchestrator.md) | Completed |
| 4 | [Update-Worker-and-Docs](./phase-04-update-worker-and-docs.md) | Completed |

## Dependencies

- Architecture reference: `docs/Flow/upload/upload-ai-architecture.md`

## Key Decisions

1. **Placeholder pattern**: Async functions returning hardcoded defaults, no throws
2. **Service location**: `src/features/upload/services/` (following studio-panel pattern)
3. **Worker role**: Thin orchestrator calling `upload-processor.service`
4. **Backward compatibility**: Keep existing actions unchanged, worker is internal detail
