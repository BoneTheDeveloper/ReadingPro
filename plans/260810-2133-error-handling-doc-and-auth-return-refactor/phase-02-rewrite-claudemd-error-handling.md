---
phase: 2
title: "Rewrite CLAUDE.md Error Handling"
status: todo
priority: P1
effort: "45m"
dependencies: [1]
---

# Phase 2: Rewrite CLAUDE.md Error Handling

## Overview

Replace the stale `## Error Handling` section of `CLAUDE.md` (lines 82-128) so
it describes the code as it exists after Phase 1. Every claim must be traceable
to a source line.

## Requirements

**Functional:**
- Document the auth `return` pattern from Phase 1 as the convention for API routes
- Document `AppError.isExpected` and the 4xx/5xx logging + Sentry split
- Document `ZodError` → 400 `VALIDATION` mapping
- Document `unstable_rethrow` and why it comes first in the catch
- Document the error envelope shape as a shared contract
- State the throw-vs-return boundary unambiguously — a reader must never have to guess

**Non-functional:**
- Prescriptive and terse, matching the existing CLAUDE.md voice
- No invented behavior. If it is not in the code, it does not go in the doc
- Do not touch other CLAUDE.md sections

## Architecture

### Content the current doc is missing

| Missing | Source |
|---------|--------|
| `isExpected` split: 4xx `info` + no Sentry, 5xx `error` + Sentry + sanitized | `with-error-handling.ts:37-45` |
| `ZodError` → 400 `VALIDATION`, `issues` as `details` | `with-error-handling.ts:29-35` |
| `unstable_rethrow` guards Next.js control-flow throws | `with-error-handling.ts:27` |
| requestId (`x-request-id` or generated) + child logger | `with-error-handling.ts:17-22` |
| `ERROR_CODES` is a closed set | `app-error.ts:1-11` |
| Envelope `{ error: { code, message, details? } }` | `app-error.ts:13-19`, `toBody()` L37 |
| `fetchJson` fallback when a response never reached a handler | `fetch-json.ts:37-52` |

### The rule to state explicitly

This is the part a reader must not have to infer:

| Situation | Pattern | Reason |
|-----------|---------|--------|
| Auth pre-check in handler | `return auth.response` | Compile-enforced; matches Next.js docs |
| Zod input parsing | `.parse()` — let it throw | `ZodError` → 400 already centralized |
| Domain error in service | `throw AppError` | Services do not know HTTP |
| Unexpected failure | let it throw | `withErrorHandling` sanitizes + reports |

### Flow diagram to replace the existing one

```
Handler: auth guard fails    → return auth.response (401, no throw)
Handler: Zod .parse() fails  → ZodError  ─┐
Service: throw AppError                   ├→ withErrorHandling
Anything else throws                      ─┘        │
                                                    ├─ unstable_rethrow (Next.js control flow)
                                                    ├─ ZodError    → 400 VALIDATION + issues
                                                    ├─ isExpected  → log.info,  original status, NO Sentry
                                                    └─ otherwise   → log.error, 500 sanitized, Sentry
                                                                    ↓
                          fetchJson parses envelope → throws ApiError { status, code, message, details }
                                                                    ↓
                          QueryCache/MutationCache onError → console.error
                                                                    ↓
                          error.tsx / global-error.tsx (render)
```

## Related Code Files

**Modify:**
- `CLAUDE.md` — `## Error Handling` section only (currently lines 82-128)

**Read for verification (do not modify):**
- `src/lib/error/with-error-handling.ts`
- `src/lib/error/app-error.ts`
- `src/lib/api/fetch-json.ts`
- `src/lib/query-client.ts`
- `src/lib/auth/session.ts` — post-Phase-1 state

## Implementation Steps

1. Re-read all five source files above **after** Phase 1 has landed. Do not
   write from this plan's snapshot — write from the code.
2. Replace the flow diagram with the version in Architecture.
3. Add a **Throw vs Return** subsection containing the rule table verbatim.
4. Rewrite **Server Errors** to cover `unstable_rethrow` ordering, `ZodError`,
   `isExpected`, requestId, and the Sentry boundary.
5. Add an **Error Envelope** subsection with `ERROR_CODES` and the body shape,
   noting both server and client depend on it.
6. Update the **File Responsibilities** table — add `src/lib/auth/session.ts`
   (returns 401 response, does not throw).
7. Leave **Client Errors** and **Render Errors** intact unless a claim is now
   false; verify each line against source rather than assuming.

## Validation

Line-by-line trace: every statement in the new section must map to a file and
line number. Anything that cannot be traced is deleted, not softened.

Specific checks:
- Doc says 4xx skips Sentry → confirm `with-error-handling.ts:38-40`
- Doc's envelope shape → confirm `app-error.ts:37-45`
- Doc's retry rule → confirm `query-client.ts:9-10`
- Doc's auth pattern → confirm it matches the Phase 1 code, not this plan's draft

```bash
pnpm lint
```

## Success Criteria

- [ ] Throw-vs-return boundary stated as an explicit table
- [ ] `isExpected` / Sentry split documented
- [ ] `ZodError` → 400 documented
- [ ] `unstable_rethrow` documented with its ordering rationale
- [ ] Envelope shape + `ERROR_CODES` documented as a shared contract
- [ ] File Responsibilities table includes `session.ts`
- [ ] Every claim traced to a source line
- [ ] No other CLAUDE.md section modified

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Doc drifts from Phase 1's actual implementation | Medium | Step 1 forces re-reading real code, not this plan |
| Over-documenting into an unreadable wall | Medium | Match existing terse voice; tables over prose |
| Silently "fixing" a client/render claim that was fine | Low | Step 7: verify before editing, do not rewrite by default |

**Rollback:** documentation-only. `git checkout CLAUDE.md`. No runtime impact.
