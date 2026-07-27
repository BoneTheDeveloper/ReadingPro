---
phase: 2
title: "Client Server Translation"
status: pending
priority: P1
effort: "0.5d"
dependencies: [1]
---

# Phase 2: Client Server Translation

## Overview

Replace the placeholder translator timer with a real `fetch("/api/translate")` call and the placeholder service body with an isolated unofficial Google Translate provider. The hook keeps its stale-token guard via `AbortController` and a monotonically increasing `requestId`. The provider only knows how to translate English → Vietnamese and returns either a typed `TranslationDto` or a typed failure; UI and API contracts remain stable.

## Context Links

- `src/features/reading/hooks/use-word-translation.ts` (placeholders to replace)
- `src/features/reading/server/services/inline-translate.ts` (placeholder body to replace)
- `src/app/api/translate/route.ts` (existing route, schema, auth gate)
- `src/features/reading/schemas/translation.ts` (existing schema, no change)

## Requirements

### Functional

- `translateWord` issues `POST /api/translate` with `{ text, context, sourceId, sourceLanguage: "en", targetLanguage: "vi" }`.
- A successful 200 response transitions state from `loading` to `success` with `provider === "google_translate"` and a non-null `translation`.
- A 401 response closes any open request, resets state, and surfaces the auth-gate failure (this is acceptable; the popup keeps showing the icon and the user can re-select).
- A 4xx / 5xx / network failure transitions state to `error`; the popup shows a retry button that re-issues the same call.
- An empty `translation` value (the provider returned `null`) transitions state to `success` with `data.translation === null`. The popup renders its `empty` branch.
- An in-flight request is aborted when the user starts a new translation, when the user picks a new selection, when the popup closes, when the passage changes, or when the view-mode changes.
- The provider module runs on the server only (`import "server-only"`), never bundles into the client, validates inputs with `zod`, enforces a hard timeout, and returns one of:
  - `{ ok: true, data: TranslationDto }`
  - `{ ok: false, kind: "parse" | "upstream" | "timeout", status: number }`

### Non-Functional

- Provider URL is a single constant inside the service module. Swapping to the official Google Cloud API requires only editing the service.
- All requests carry a `User-Agent` and an `Accept-Language` header for stability.
- No usage of `eval`, no JSON parsers other than `JSON.parse`, no third-party HTTP client.
- No new runtime dependencies are required. The project already uses `zod`.

## Architecture

```
browser                          /api/translate                          service
   │                                  │                                     │
click → fetch({ POST }) ────────────►│ auth.api.getSession                 │
       status 200 ◄──────────────────│ executeTranslate(input) ───────────►│ provider
       status 4xx ◄──────────────────│ ↑ returns typed failure             │
                                     │                                     │

state machine: idle → ready → loading → {success | error | empty}
abort: hook cancels with AbortController on
  - new selection
  - passage / viewMode change (already in effect)
  - popup close
  - re-click on a word already resolved (re-runs)
```

## Related Code Files

- Modify: `src/features/reading/hooks/use-word-translation.ts`
- Modify: `src/features/reading/server/services/inline-translate.ts`
- (No change) `src/app/api/translate/route.ts`
- (No change) `src/app/api/translate/route.ts` — schema and auth remain the single source of truth.

## Implementation Steps

1. **Replace the placeholder timer in `use-word-translation.ts`.**
   - Replace the `setTimeout` block in `translateWord` with:
     - Build payload from `selectedWordInfo.selectedText` and `selectedWordInfo.contextSentence`.
     - Create `AbortController`; store it in a `useRef` so the same hook instance can cancel prior in-flight calls.
     - `fetch("/api/translate", { method: "POST", signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })`.
     - On `response.ok` → `await response.json()` → set `data` and `status: "success"`. If `data.translation == null`, keep the success branch and rely on popup to render the empty state.
     - On `response.status === 401` → reset to `idle` and stop. (Re-auth is out of scope; the popup stays quiet.)
     - On `response.status === 4xx` / 5xx → set `status: "error"`.
     - On `AbortError` → swallow; do not flip to `error`.
     - On any other thrown error → set `status: "error"`.
   - Increment `translationRequestCounter` as before; assign the response to the captured `requestId` only when no newer request has started, otherwise drop the response.
   - Remove `PLACEHOLDER_LOOKUP` and `lookupPlaceholder`.
2. **Replace the placeholder body in `inline-translate.ts`.**
   - Validate input with the existing `zod` schema from `src/app/api/translate/route.ts` (or duplicate the schema locally if reducing imports is preferred; defaulting to duplicate keeps the service self-contained and avoids importing across `app/api`).
   - Construct the unofficial Google Translate URL with `text`, `sl=auto` (we still set `sourceLanguage: "en"` for guardrails at the route) → resolved to `en`, and `tl=vi`.
   - Send `fetch` with `signal: AbortSignal.timeout(7000)` and a small fixed `User-Agent`.
   - Parse the response; tolerate both the JSON wrapper and the legacy array response. Only return data when the parsed translation matches `^[A-Za-z0-9À-ỹ\s,;:.!?()'\"\-+/]+$` so accidental HTML / JSON pages do not leak.
   - On failure → return `{ ok: false, kind: "upstream", status: 502 }` (or `kind: "timeout"` if the AbortSignal fired).
3. **Wire retry behaviour in `InlineTranslationPopup`.**
   - When `state.status === "error"`, render a retry button that calls the existing `onTranslate` prop. The hook holds the previous `selectedWordInfo`, so `onTranslate` re-runs cleanly.
4. **Confirm route stays unchanged.**
   - The route already validates auth + body. Phase 2 leaves it untouched; only the service body changes. This is intentional so a future swap of provider does not need a route change.

## Success Criteria

- [ ] `pnpm typecheck` passes after both file changes; no `any` introduced.
- [ ] `pnpm lint` passes.
- [ ] `pnpm knip` does not flag `PLACEHOLDER_LOOKUP` or its function as unused after their removal.
- [ ] A `curl POST /api/translate` for `"gesture"` returns `{ translation: <vietnamese>, provider: "google_translate", ipa: null }` and never returns `provider: "fallback"` again for this endpoint.
- [ ] Aborting via `AbortController` causes the `loading` spinner to fade without an `error` toast.
- [ ] Rapidly selecting two different words always shows the most recent word's translation; the slower response never overwrites the newer one.

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Unofficial Google endpoint throttles or revokes the request shape | Hard timeout, content-type guard, and a typed failure surface; UI degrades gracefully and shows an error popup. The service owns the constant — replacing it is local. |
| Provider returns HTML or empty body | Strict type guard + JSON parsing failure path returns `{ ok: false, kind: "parse", status: 502 }`. |
| CORS / IP-level restriction on the unofficial endpoint when called from outside Google IPs | Already addressed by routing through the server. |
| Race conditions when two requests finish out of order | Stale-token guard via `requestId` plus `AbortController` cancellation. |
| Lint flags `any` in error handlers | Use `unknown` and narrow; do not silence. |

## Security Considerations

- Provider URL and headers are constants inside a `server-only` module; the client only knows the server route.
- Reject any parsed translation that contains characters outside the Vietnamese safe set listed above.
- Keep the route's existing `zod` validation; do not weaken the payload contract.
- The provider URL and any future keys must not leak to the browser bundle; verified by code-splitting at the `app/api` boundary.
