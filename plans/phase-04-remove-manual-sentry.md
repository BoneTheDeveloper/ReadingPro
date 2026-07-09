---
phase: 4
title: "Remove Manual Sentry Calls"
status: pending
priority: P1
effort: "2h"
dependencies: [2, 3]
---

# Phase 4: Remove Manual Sentry Calls

## Overview

Remove ~45 manual Sentry.* calls from 18 files. Auto-capture + toHttp/withAction handles everything.

## Requirements

- Functional: Remove all Sentry.startSpan, Sentry.addBreadcrumb, Sentry.captureException calls
- Non-functional: Keep toHttp() captureException in route-errors.ts

## Files to Modify (18 files)

### Group A: Remove Sentry imports + all calls (13 files)
1. `src/features/studio-panel/ui/studio/chat/chat-panel.tsx` - remove 9 Sentry calls
2. `src/features/studio-panel/ui/studio/lookup/lookup-panel.tsx` - remove 1 Sentry call
3. `src/features/studio-panel/hooks/use-study-artifacts.ts` - remove 1 Sentry call
4. `src/features/learning-session/hooks/use-learning-session-tracker.ts` - remove 1 Sentry call
5. `src/features/upload/services/upload-service.ts` - remove 2 Sentry calls
6. `src/features/upload/db/upload-workflow.ts` - remove 3 Sentry calls
7. `src/features/ai-chat/services/chat-service.ts` - remove 1 Sentry.startSpan (keep for now, it's useful for AI tracing)
8. `src/features/reading/services/inline-translate.service.ts` - remove 1 Sentry call
9. `src/features/reading/db/word-translate.ts` - remove 1 Sentry call
10. `src/features/dictionary/hooks/use-save-dictionary-vocabulary.ts` - remove 3 Sentry calls
11. `src/features/passage/services/passage-study.service.ts` - remove 2 Sentry calls
12. `src/app/global-error.tsx` - remove 1 Sentry call
13. `src/components/system/error-boundary.tsx` - remove 1 Sentry call

### Group B: Keep captureException, remove setUser (1 file)
14. `src/lib/auth-server.ts` - remove Sentry.setUser calls only

### Group C: Special - review individually (3 files)
15. `src/app/api/studio/chat/route.ts` - has manual captureException for specific error, review if needed
16. `src/app/[locale]/(dashboard)/error.tsx` - Next.js default error boundary, review
17. `src/app/[locale]/(dashboard)/study/_components/study-workspace.tsx` - 13 addBreadcrumbs, review

### Group D: KEEP (1 file)
18. `src/lib/http/route-errors.ts` - KEEP captureException (centralized error boundary)

## Implementation Steps

1. Group A files - bulk remove:
   - Remove `import * as Sentry from "@sentry/nextjs"` if no other Sentry usage
   - Remove all Sentry.startSpan, Sentry.addBreadcrumb, Sentry.captureException calls
   - Replace spans with direct function calls (already covered by auto-instrumentation)

2. Group B (auth-server.ts):
   - Remove Sentry.setUser({ id: session.user.id }) calls only

3. Group C files - review each:
   - Determine if calls are truly redundant or provide unique value
   - Remove if redundant with auto-capture

4. Run typecheck after each group
5. Verify all builds pass

## Success Criteria

- [ ] All manual Sentry.startSpan removed (except chat-service.ts if kept)
- [ ] All Sentry.addBreadcrumb removed
- [ ] Sentry.captureException removed from all except route-errors.ts
- [ ] Sentry.setUser removed from auth-server.ts
- [ ] TypeScript compiles without errors
- [ ] App builds successfully

## Risk Assessment

- **Risk**: Some manual spans provide useful context (e.g., AI model ID)
- **Mitigation**: Keep chat-service.ts startSpan for now - it's valuable for AI tracing
- **Risk**: Breaking user tracking in Sentry
- **Mitigation**: setUser can be re-added later if needed via middleware
