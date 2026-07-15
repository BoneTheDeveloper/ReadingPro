# Research Report: API Response Patterns in Next.js

**Date:** 2026-07-15
**Topic:** Best practices for API response schemas and validation

---

## TL;DR — Direct Answer

**Skip response envelopes entirely.** Use one of:

1. **Server Actions** (default) — no envelope needed, errors throw naturally
2. **tRPC** — handles envelope + types automatically (full-stack)
3. **Direct Response** (MVP) — `Response.json({ data })` + manual error handling

---

## What the industry actually does

### tRPC (full-stack type safety)

tRPC is the gold standard — it generates both server and client types automatically:

```typescript
// Server
const appRouter = router({
  translate: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(({ input }) => ({ translation: translate(input.text) })),
});

// Client — fully typed, no envelope
const result = await trpc.translate.mutate({ text: "hello" });
// result.translation is typed
```

**Verdict:** Best for complex apps. Adds dependency. You already have a simpler stack.

### Next.js official docs pattern

Direct Response with try/catch:

```typescript
export async function POST(req: Request) {
  try {
    const data = await doSomething(req);
    return Response.json(data); // Success: return data directly
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
```

**Verdict:** Simple. No schema. No envelope. Works for MVP.

### Vercel AI SDK pattern

For AI streaming (your `/api/ai-chat`):

```typescript
// AI SDK handles streaming internally
return result.toUIMessageStreamResponse();
// No envelope needed — streaming is different
```

### Response envelope pattern (old)

```typescript
// Discriminated union for success/error
const response = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), data: mySchema }),
  z.object({ success: z.literal(false), error: z.string() }),
]);
```

**Verdict:** Works but adds complexity. Only needed when:
- Multiple error shapes (validation error vs not-found vs conflict)
- External API consumers need consistent format
- You're building a public API

---

## For your MVP

**Decision: Drop the envelope entirely.**

### Rationale

- You're the only consumer (your app calls your own endpoints)
- Server Actions already handle errors natively
- Envelope adds boilerplate without value at MVP stage

### What to use instead

**Option 1: Server Actions (recommended)**
```typescript
// features/reading/server/actions/inline-translate.ts
'use server'
export async function translateAction(formData: FormData) {
  const userId = await getUserId();
  const result = await executeTranslate({ ... }, { userId });
  if (!result.ok) throw new Error("Source not found");
  revalidatePath('/study');
  return result.data;
}

// Client
const data = await translateAction(formData); // throws on error
```

**Option 2: Direct Response (for remaining Route Handlers)**
```typescript
// app/api/translate/route.ts
export async function POST(req: Request) {
  try {
    const result = await executeTranslate(input);
    if (!result.ok) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(result.data);
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
```

**Option 3: tRPC (if you need it later)**

Add when:
- Multiple consumers beyond your app
- Complex nested procedures
- Need end-to-end type safety without manual schema

---

## What to do right now

1. **Remove** `translateResponseSchema` from `features/reading/schemas/translation.ts`
2. **Simplify** client validation to manual checks:
```typescript
// study-workspace.tsx
const data = await fetch('/api/translate', { ... }).then(r => r.json());
if (data.error) throw new Error(data.error);
```
3. **Keep** `translationDataSchema` for Zod validation on input
4. **Delete** `src/lib/api-response.ts` (don't create it — not needed)
5. **Add tRPC later** only if you need public API or multiple consumers

---

## Sources

- [Next.js Backend for Frontend guide](https://nextjs.org/docs/app/guides/backend-for-frontend) — no envelope pattern recommended
- [tRPC documentation](https://trpc.io/docs/) — type-safe API without envelopes
- [Vercel AI SDK](https://github.com/vercel/ai) — streaming handles errors natively
- [Next.js Server Actions docs](https://nextjs.org/docs/app/guides/server-actions) — throw errors, let framework handle

---

## Unresolved Questions

- Do you need tRPC for future public API? (probably not for MVP)
- Any external consumers beyond your app? (if yes, consider envelopes)
