---
phase: 4
title: "captureClientError helper + convert client/server captures + tests"
status: completed
priority: P1
effort: "2h"
dependencies: [3]
---

# Phase 4: captureClientError helper + convert captures + tests

## Overview

Create `captureClientError(err, ctx)` helper (client symmetric to server `toHttp`).
Route scattered client `captureException` through it. Standardize special server
stream-callback capture. Add regression tests for error→status mapping + helper.

## Requirements

- Functional: single client capture entrypoint with consistent tags/context.
- Non-functional: KEEP all legit error boundaries. No behavior change in HTTP mapping.

## Capture site classification (verified inventory)

### KEEP as-is (legit boundaries — capture is correct here)
- `src/lib/http/route-errors.ts:40` — toHttp (server boundary) + `tags:{route}`
- `src/lib/observability/with-action.ts:54` — withAction (server boundary) + `tags:{action}`
- `src/app/global-error.tsx:14` — client React root boundary
- `src/app/[locale]/(dashboard)/error.tsx:17` — client route boundary
- `src/components/system/error-boundary.tsx:29` — client ErrorBoundary (has componentStack)

### CONVERT to captureClientError() (client ad-hoc captures)
- `src/features/studio-panel/hooks/use-study-artifacts.ts:66`
- `src/features/studio-panel/ui/studio/chat/chat-panel.tsx:73`

### SPECIAL (server, NOT through toHttp — stream callback)
- `src/app/api/studio/chat/route.ts:101` — inside `onFinishPersistError` callback.
  Keep capture (fire-and-forget during stream). Keep existing `log.error` above it.
  Standardize tags via inline object (already has route/method/operation tags). No helper needed server-side (only 1 site).

## Architecture

```typescript
// src/lib/observability/capture-client-error.ts  ("use client" safe — no server-only)
import * as Sentry from "@sentry/nextjs";

type ClientErrorContext = {
  scope: string;                         // e.g. "studio.chat.send"
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

// Client-side symmetric of toHttp's capture: one place to attach tags/context.
export function captureClientError(err: unknown, ctx: ClientErrorContext) {
  Sentry.captureException(err, {
    tags: { scope: ctx.scope, ...ctx.tags },
    extra: ctx.extra,
  });
}
```

## Related Code Files

- Create: `src/lib/observability/capture-client-error.ts`
- Create: `src/lib/observability/__tests__/route-errors.test.ts` (or colocated per repo convention)
- Create: `src/lib/observability/__tests__/capture-client-error.test.ts`
- Modify: `use-study-artifacts.ts`, `chat-panel.tsx` (client captures → helper)
- Verify: `api/studio/chat/route.ts` (keep capture, ensure tags consistent)

## Implementation Steps

1. Create `capture-client-error.ts` helper.
2. Replace `Sentry.captureException` in `use-study-artifacts.ts` + `chat-panel.tsx`
   error path with `captureClientError(err, { scope, extra })`.
3. Leave the 5 KEEP boundaries untouched.
4. Tests:
   - `toHttp`: NotFound→404, Auth→401, ZodError→400, unknown→500 (assert status + no throw).
   - `captureClientError`: calls `Sentry.captureException` with merged tags (mock Sentry).
5. `pnpm run typecheck && pnpm run lint` + run tests.

## Success Criteria

- [ ] `captureClientError` helper created + used in the 2 client ad-hoc sites.
- [ ] 5 boundary captures unchanged.
- [ ] Server stream-callback capture retained with consistent tags.
- [ ] Tests: toHttp mapping (4 cases) + helper tag-merge pass.
- [ ] Typecheck + lint pass.

## Risk Assessment

- **Risk**: `chat-panel.tsx` capture is entangled with spans removed in Phase 5.
  **Mitigation**: do error-path conversion here; span removal in Phase 5 touches same file — sequence 4→5, single owner.
- **Risk**: over-abstracting for few sites. **Mitigation**: helper is ~10 lines, 2+ callers → justified DRY.
