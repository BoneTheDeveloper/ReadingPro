---
title: "Phase 02: Server + Client Error Capture"
issues: [ENG-27, ENG-28]
status: complete
priority: P1
effort: 1.5h
dependencies: [phase-01]
---

## Context Links

- Phase 01: [phase-01-sdk-config-foundation.md](phase-01-sdk-config-foundation.md)
- API routes: `src/app/api/upload/route.ts`, `src/app/api/upload/text/route.ts`, `src/app/api/study-session/route.ts`, `src/app/api/cards/review/route.ts`
- Server actions: `src/app/actions/analyze.ts`
- Layout: `src/app/layout.tsx`
- Sentry server actions docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

## Overview

Add `Sentry.captureException()` to all server-side catch blocks. Create React error boundaries for client-side error capture. Wrap server actions with `Sentry.withServerActionInstrumentation()`.

## Key Insights

- `instrumentation.ts` `onRequestError` already auto-captures unhandled server errors (Phase 01)
- We add **explicit** `captureException` in catch blocks for richer context (tags, breadcrumbs)
- Server actions should use `withServerActionInstrumentation()` for trace linking
- `global-error.tsx` is required at root -- catches errors in root layout
- `error.tsx` files per route segment catch nested errors
- React error boundaries use class components (functional components can't catch render errors)
- All routes currently use `demo@example.com` -- tag with userId when auth exists

## Requirements

### Functional (ENG-27)
- Add `captureException` to catch blocks in:
  - `src/app/api/upload/route.ts` (POST)
  - `src/app/api/upload/text/route.ts` (POST)
  - `src/app/api/study-session/route.ts` (POST, PATCH)
  - `src/app/api/cards/review/route.ts` (POST)
- Wrap `analyzeContentAction` and `studyAnalyzeAction` with `withServerActionInstrumentation()`
- Add contextual tags: `route`, `method`, `action`
- Add breadcrumbs for multi-step ops (PDF parse, AI calls, DB writes)
- Preserve existing Pino logging (Sentry is additive)

### Functional (ENG-28)
- Create `src/components/error-boundary.tsx` (React error boundary class)
- Create `src/app/global-error.tsx` (root-level error page)
- Create `src/app/(dashboard)/error.tsx` (dashboard route group)
- Create `src/app/(dashboard)/reading/[id]/error.tsx`
- Create `src/app/(dashboard)/test/[id]/error.tsx`
- Create `src/app/(dashboard)/study/error.tsx`
- All error pages: capture to Sentry, show friendly UI, "Try again" button

### Non-Functional
- Existing Pino `log.error()` calls remain untouched
- No duplicate error reports (Sentry auto-capture + manual captureException)
- Error pages must be client components ("use client")
- Minimal bundle impact from error boundaries

## Architecture

### Server Error Flow
```
API route catch block
  -> log.error({ err }, 'message')      // Pino (existing)
  -> Sentry.captureException(error, {    // Sentry (new)
       tags: { route, method },
       contexts: { route: { requestBody } }
     })
  -> return NextResponse.json({ error }) // Existing response
```

### Server Action Flow
```
withServerActionInstrumentation('actionName', { headers }, async () => {
  // existing action logic
  // catch blocks get captureException with tags
})
```

### Client Error Flow
```
React render error
  -> error.tsx (route segment) or global-error.tsx (root)
  -> useEffect(() => Sentry.captureException(error))
  -> Render fallback UI with "Try again"
```

## Related Code Files

### Modify
- `src/app/api/upload/route.ts` -- add captureException + breadcrumbs
- `src/app/api/upload/text/route.ts` -- add captureException
- `src/app/api/study-session/route.ts` -- add captureException (2 handlers)
- `src/app/api/cards/review/route.ts` -- add captureException
- `src/app/actions/analyze.ts` -- wrap with withServerActionInstrumentation

### Create
- `src/components/error-boundary.tsx` -- reusable error boundary class
- `src/app/global-error.tsx` -- root error page
- `src/app/(dashboard)/error.tsx` -- dashboard error page
- `src/app/(dashboard)/reading/[id]/error.tsx` -- reading error page
- `src/app/(dashboard)/test/[id]/error.tsx` -- test error page
- `src/app/(dashboard)/study/error.tsx` -- study error page

## Implementation Steps

1. Create `src/components/error-boundary.tsx`:
   - Class component extending `React.Component`
   - `componentDidCatch(error, errorInfo)` -> `Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } })`
   - `getDerivedStateFromError` -> set `hasError: true`
   - Render children or fallback with reset button
   - Props: `children`, `fallback?: ReactNode`

2. Create `src/app/global-error.tsx`:
   - `"use client"` directive
   - Import `Sentry.captureException`
   - `useEffect` to capture error
   - Render minimal HTML (must include `<html>` + `<body>` since root layout is replaced)
   - "Something went wrong" + "Try again" button calling `reset()`

3. Create route-segment `error.tsx` files:
   - Each: `"use client"`, capture to Sentry, show friendly message + reset button
   - Dashboard error: generic "Something went wrong"
   - Reading/[id] error: "Failed to load reading passage"
   - Test/[id] error: "Failed to load test"
   - Study error: "Failed to load study session"

4. Update API routes -- for each catch block:
   - Import `* as Sentry from '@sentry/nextjs'`
   - After existing `log.error()`, add `Sentry.captureException(error, { tags: { route: 'api:...', method: 'POST' } })`
   - Add breadcrumbs before multi-step ops: `Sentry.addBreadcrumb({ category: 'parse', message: 'Parsing PDF', level: 'info' })`

5. Update `src/app/actions/analyze.ts`:
   - Import `* as Sentry from '@sentry/nextjs'`
   - Wrap `analyzeContentAction` body with `Sentry.withServerActionInstrumentation('analyzeContent', { headers: await headers() }, async () => { ... })`
   - Wrap `studyAnalyzeAction` body similarly
   - Add breadcrumbs for CEFR detection, simplification, question generation steps
   - Add captureException in individual AI catch blocks with tags: `{ step: 'cefr' | 'simplify' | 'questions' }`

6. Verify all changes compile with `npm run build`

## Todo List

- [ ] Create `src/components/error-boundary.tsx`
- [ ] Create `src/app/global-error.tsx`
- [ ] Create `src/app/(dashboard)/error.tsx`
- [ ] Create `src/app/(dashboard)/reading/[id]/error.tsx`
- [ ] Create `src/app/(dashboard)/test/[id]/error.tsx`
- [ ] Create `src/app/(dashboard)/study/error.tsx`
- [ ] Update `src/app/api/upload/route.ts` -- captureException + breadcrumbs
- [ ] Update `src/app/api/upload/text/route.ts` -- captureException
- [ ] Update `src/app/api/study-session/route.ts` -- captureException x2
- [ ] Update `src/app/api/cards/review/route.ts` -- captureException
- [ ] Update `src/app/actions/analyze.ts` -- withServerActionInstrumentation + breadcrumbs
- [ ] Verify `npm run build` passes

## Success Criteria

- All server catch blocks call `Sentry.captureException` with contextual tags
- All server actions wrapped with `withServerActionInstrumentation`
- Error pages exist at root + all route segments with nested layout
- Pino logging still works (log.error calls preserved)
- Build passes, dev server starts
- Triggering a test error in browser shows Sentry capture + friendly UI

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Duplicate errors (auto + manual capture) | Medium | Low | `onRequestError` only fires on unhandled; our catch blocks handle errors, so auto-capture won't fire |
| `withServerActionInstrumentation` requires `headers()` import | Low | Medium | Import `headers` from `next/headers`; wrap in try-catch if headers unavailable |
| Error pages not rendering correctly | Low | Medium | `global-error.tsx` must include `<html>` + `<body>` tags |
| Build size increase from error pages | Low | Low | Error pages are code-split by Next.js |

## Security Considerations

- Do not include request body in Sentry tags (may contain user text/content)
- Breadcrumbs should reference operation type, not data content
- Error messages shown to user are generic; details only in Sentry

## Next Steps

- Phase 03 adds `pinoIntegration()` to Sentry config files created here
- Phase 04 configures source maps for better stack traces
- Phase 05 tests all capture points
