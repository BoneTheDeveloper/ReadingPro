---
phase: 1
title: "Create Artifact Generation Workflow"
status: completed
priority: P1
effort: "1.5h"
dependencies: []
completed: 2026-08-20T20:58:00+07:00
---

# Phase 1: Create Artifact Generation Workflow

## Overview

Create a new Vercel Workflow for artifact generation that handles both flashcard and question generation. The workflow will call the existing `generateAndStoreArtifact` service function and manage error handling with Sentry logging.

## Requirements

- Functional: Workflow definition with `use workflow` directive
- Functional: Step to call `generateAndStoreArtifact`
- Functional: Error handling in workflow (not routes) — call failStep on catch

## Related Code Files

- Create: `src/workflows/artifact-generation/index.ts`
- Create: `src/workflows/artifact-generation/steps.ts`
- Reference: `src/features/studio/server/service/artifact-generator.ts` (unchanged)
- Reference: `src/workflows/passage-processing/` (pattern to follow)

## Implementation Steps

1. **Create workflow directory structure**
   ```bash
   mkdir -p src/workflows/artifact-generation
   ```

2. **Create `src/workflows/artifact-generation/steps.ts`**
   ```typescript
   import "server-only";
   import { generateAndStoreArtifact } from "@/features/studio/server/service/artifact-generator";
   import { updateArtifactStatus } from "@/features/studio/server/service/artifact-crud";
   import { StudioArtifactType } from "@/generated/prisma/enums";

   export interface ArtifactGenerationInput {
     artifactId: string;
     userId: string;
     passageId: string;
     type: StudioArtifactType;
   }

   export async function generateArtifactStep(args: ArtifactGenerationInput) {
     "use step";
     await generateAndStoreArtifact({
       artifactId: args.artifactId,
       userId: args.userId,
       passageId: args.passageId,
       type: args.type,
     });
   }

   export async function failStep(args: ArtifactGenerationInput) {
     "use step";
     await updateArtifactStatus({
       id: args.artifactId,
       userId: args.userId,
       status: "FAILED",
     });
   }
   ```

   **Note**: No logging, no Sentry in steps — just update status to FAILED.

3. **Create `src/workflows/artifact-generation/index.ts`**
   ```typescript
   import type { ArtifactGenerationInput } from "./steps";
   import { generateArtifactStep, failStep } from "./steps";

   export async function artifactGenerationWorkflow(args: ArtifactGenerationInput) {
     "use workflow";
     try {
       await generateArtifactStep(args);
     } catch (err) {
       await failStep(args);
       throw err;
     }
   }
   ```

4. **Verify with typecheck**
   ```bash
   pnpm typecheck
   ```

## Success Criteria

- [ ] `src/workflows/artifact-generation/index.ts` exists
- [ ] `src/workflows/artifact-generation/steps.ts` exists
- [ ] `artifactGenerationWorkflow` is exported
- [ ] No manual error handling (Sentry/log) — workflow handles retries natively
- [ ] Typecheck passes
