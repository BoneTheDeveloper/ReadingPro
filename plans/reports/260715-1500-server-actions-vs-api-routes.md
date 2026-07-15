# Research Report: Server Actions vs API Routes

**Date:** 2026-07-15
**Sources:** Next.js official docs (v16.2.10), Next.js blog (v15), Web search

## Executive Summary

Next.js App Router's two data mutation patterns—Server Actions and API Routes—serve fundamentally different purposes. Server Actions are the **default choice** for mutations triggered by the Next.js app itself (forms, button clicks). API Routes (Route Handlers) are for **external consumers** or capabilities that crosscut the standard request/response model (webhooks, third-party integrations, streaming AI, CORS-exposed endpoints). Most internal mutations in a Next.js app should migrate to Server Actions. API Routes remain necessary only for external access patterns.

## Key Findings

### 1. When to use Server Actions

- **Form submissions** — the primary use case. Native `<form action={serverAction}>` with progressive enhancement (works without JS)
- **Button/mutation triggers** — `onClick`, `formAction`, `useActionState` for pending state
- **Mutations that need cache invalidation** — `revalidatePath`, `revalidateTag`, `updateTag` ship in the same response roundtrip
- **Mutations that need redirect** — `redirect()` throws and ships the new page's RSC payload in the same response
- **Mutations that set cookies** — auto-triggers server re-render to reflect new cookie value
- **Internal app mutations** — any POST/PATCH/DELETE from React components in your own app

Key benefit: single roundtrip. Next.js re-renders the route server-side and ships both the action's return value and the new RSC payload in one response. No separate fetch needed to update UI.

### 2. When to keep API Routes

- **External webhooks** — third-party services POST to your app (Stripe, payment providers, Inngest events)
- **Third-party API integration** — your app acts as a proxy or consumer of external APIs
- **Streaming responses** — AI chat streaming, Server-Sent Events, ReadableStream (AI SDK pattern)
- **Public REST APIs** — if your app exposes a public API consumed by non-Next.js clients
- **CORS-enabled endpoints** — endpoints that must be accessed from different origins
- **Non-mutation reads** — complex GET handlers with custom caching headers
- **Multipart/binary uploads** — large file uploads with custom body parsing

### 3. Security are equivalent

Server Actions and API Routes are both **untrusted entry points**. Next.js enforces CSRF protection on Server Actions (Origin check), but application-level auth/authorization is required on both. The docs explicitly state: "Treat every action as an untrusted entry point."

Server Actions in Next.js 15+ have encrypted action IDs and dead code elimination (unused server functions have no public endpoint).

### 4. Your current routes analysis

| Route | Type | Recommendation |
|---|---|---|
| `/api/ai-chat` | AI streaming | **Keep as API Route** — streaming response, AI SDK pattern |
| `/api/translate` | Internal mutation | **Migrate to Server Action** — called by your own app |
| `/api/health` | Infrastructure | **Keep as API Route** — external health checks, monitoring |
| `/api/inngest` | Webhook | **Keep as API Route** — Inngest POSTs events |
| `/api/local-blob` | Dev file serving | **Keep as API Route** — serves binary files |
| `/api/auth/[...all]` | Auth framework | **Keep as API Route** — Better Auth's internal handler |

### 5. Your feature server actions vs routes

Current pattern: API Routes call feature `server/services/`. Better: Server Actions call the same services, since most mutations are internal.

**Route → Server Action migration pattern:**
```typescript
// Before: API Route calling service
// app/api/vocabulary/route.ts
export const POST = withRoute(..., async (req) => {
  await createVocabularyItem(await parseBody(req));
  return Response.json({ success: true });
});

// After: Server Action calling service
// features/vocabulary/server/actions/vocabulary.ts
'use server'
export async function createVocabularyAction(formData: FormData) {
  await createVocabularyItem(parseFormData(formData));
  revalidatePath('/vocabulary');
}
```

### 6. Sequential dispatch limitation

Server Actions dispatch **one at a time** per client. If a user triggers 3 actions rapidly, the second waits for the first. Solution: batch work inside a single action. For parallel work, use a Route Handler.

### 7. Route Handler caching changed in Next.js 15

`GET` Route Handlers are **no longer cached by default** (was cached in v14). Must explicitly opt in with `export const dynamic = 'force-static'`.

## Recommendations

### Migrate to Server Actions
- `/api/translate` → `features/reading/server/actions/inline-translate.ts`
- Vocabulary mutations (create, update, delete vocabulary items) → Server Actions
- Passage mutations → Server Actions
- Dictionary lookups triggered by UI → Server Actions

### Keep as API Routes
- `/api/ai-chat` — AI SDK streaming requires Route Handler
- `/api/inngest` — webhook receiver
- `/api/health` — external monitoring
- `/api/local-blob` — file serving
- `/api/auth/[...all]` — framework integration

### `_lib/` decision
`app/api/_lib/with-route.ts` wraps error handling + logging. If routes reduce to 2-3 infrastructure-only routes, this wrapper may be overkill. Options:
- Keep: for routes that need structured logging + Sentry
- Remove: inline 5-line try/catch in each route (trivial duplication)

## Conclusion

**Default to Server Actions** for all internal Next.js app mutations. Server Actions provide single roundtrip re-rendering, built-in progressive enhancement, and simpler code. Keep API Routes for external integrations (webhooks, AI streaming, third-party access). Your `/api/translate` route is the clearest candidate for migration — it mutates state from your own UI and should be a Server Action.

## Sources

- [Next.js Server Actions docs](https://nextjs.org/docs/app/guides/server-actions)
- [Next.js Route Handlers docs](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Next.js 15 blog](https://nextjs.org/blog/next-15)
- [Next.js Mutating Data](https://nextjs.org/docs/app/getting-started/mutating-data)
