---
title: "Phase 1: Shared Transport Layer"
status: complete
priority: P1
dependencies: []
---

# Phase 1: Shared Transport Layer

## Overview

Create the single `fetchJson`/`ApiError` helper every feature fetcher will use, and correct
`query-client.ts`'s retry predicate, which currently references a server-side error class that
client fetchers never throw. No feature code changes yet — this phase only lands the foundation
and makes `CLAUDE.md`'s error contract honest.

## Requirements

- Functional: one `fetchJson(url, schema, init)` that parses success bodies through Zod and
  throws a typed `ApiError` carrying the server's `{ code, message }` on failure.
- Functional: `query-client.ts` retry predicate matches the error type client fetchers actually throw.
- Non-functional: zero runtime coupling from client bundle to `src/lib/error/app-error.ts`
  (type-only imports).
- Non-functional: no behavior change in this phase — nothing calls `fetchJson` yet.

## Architecture

The server error envelope is already fixed by `AppError.toBody()`:

```ts
{ error: { code: ErrorCode, message: string, details?: unknown } }
```

Three call sites read it correctly today (`useCreatePassage`, `useGenerateQuestion`); the other
six discard it and substitute a hardcoded Vietnamese string. `fetchJson` centralizes that read.

`ApiError` is a **client-side** mirror of the wire format — deliberately not a subclass of
`AppError`, which models server-side throwing and carries `toResponse()`. Keeping them separate
means the client bundle imports only the `ErrorCode` *type*.

```ts
// src/lib/api/fetch-json.ts
import type { ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export async function fetchJson<T>(
  url: string,
  schema: ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);

  if (!res.ok) {
    // Non-AppError responses (proxy 502s, HTML error pages) will not match the
    // envelope; fall back to a generic message rather than surfacing raw markup.
    const body = await res.json().catch(() => null);
    const err = body?.error;
    throw new ApiError(
      res.status,
      typeof err?.code === "string" ? err.code : "INTERNAL",
      typeof err?.message === "string" ? err.message : "Đã có lỗi xảy ra",
      err?.details,
    );
  }

  return schema.parse(await res.json());
}
```

`Object.setPrototypeOf` mirrors `AppError`'s handling — required for reliable `instanceof`
across the TS downlevel boundary.

### Retry predicate correction

[query-client.ts:9](../../src/lib/query-client.ts:9) currently reads:

```ts
retry: (count, err) => isAppError(err) && err.statusCode < 500 ? false : count < 3
```

`isAppError` never matches a client-thrown error, so the effective behavior today is
`count < 3` for everything. Switching to `isApiError(err) && err.status < 500` is a no-op
*right now* (nothing throws `ApiError` yet) and becomes correct as Phases 2-4 land. This
ordering is intentional: no phase introduces a retry-behavior regression window.

## Related Code Files

- Create: `src/lib/api/fetch-json.ts`
- Modify: `src/lib/query-client.ts` (retry predicate; drop `isAppError` import)
- Modify: `CLAUDE.md` (Error Handling section)

## Implementation Steps

1. Create `src/lib/api/fetch-json.ts` with `ApiError`, `isApiError`, `fetchJson` as sketched above.
2. In `src/lib/query-client.ts`, replace the `isAppError` import with `isApiError` from
   `@/lib/api/fetch-json` and change the predicate to `err.status < 500`.
3. Update `CLAUDE.md` → **Error Handling** → **Client** table:
   - `queries.ts` row: keep "`fetchJson` throws `ApiError`" — now true. Add the module path.
   - Replace the `<ErrorState />` rows and the `### Inline error state` code block with an
     explicit status marker, e.g. `> **Not implemented yet.** Queries currently surface
     `isError` with no shared inline component; see plan 260810-0658.` Do not silently delete
     the design intent — the doc should record it as pending, not as shipped.
   - Same treatment for the `QueryCache.onError` / `MutationCache.onError` toast rows: those
     caches currently only `console.error`.
4. Run `pnpm typecheck && pnpm lint`.

## Todo

- [x] `src/lib/api/fetch-json.ts` created
- [x] `query-client.ts` retry predicate uses `isApiError`
- [x] `CLAUDE.md` Error Handling section marks unimplemented parts as pending
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes

## Success Criteria

- [x] `fetchJson` exists and is exported; no feature imports it yet
- [x] `src/lib/query-client.ts` no longer imports from `@/lib/error/app-error`
- [x] `CLAUDE.md` makes no claim about `<ErrorState />` or toasts existing in code
- [x] `pnpm knip` reports `fetchJson`/`ApiError` as unused — expected at this phase, resolved by Phase 2

## Risk Assessment

- **`pnpm knip` failing the build on the new unused export.** Check `knip.json` config; if knip
  is run as a gate, either land Phase 1 and 2 in one commit or add a temporary ignore. Prefer
  combining commits over adding config exceptions.
- **Vietnamese fallback string duplicated.** `"Đã có lỗi xảy ra"` also appears in `CLAUDE.md`'s
  `ErrorState` sketch. Acceptable — one is code, one is a doc example.
