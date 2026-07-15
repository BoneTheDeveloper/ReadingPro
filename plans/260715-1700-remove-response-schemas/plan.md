# Plan: Remove Response Schemas for Internal APIs

## Overview

Remove response envelope schemas from internal API routes and Server Actions. Keep input validation schemas. This follows the pattern: **Response Schema chỉ dùng cho Third-party APIs**.

## Why

- Internal routes (your client → your server): response shape is controlled by you
- No need for discriminated union envelope `{ success: true/false }`
- Simple error check `if (json.error) throw` is enough
- Reduces boilerplate and complexity

## Scope

| What | Action |
|------|--------|
| `translateResponseSchema` | DELETE |
| `study-workspace.tsx` client validation | SIMPLIFY |
| Input schemas (vocabulary, studio-panel, etc.) | KEEP |
| Feature DTO schemas | KEEP |

## Changes

### 1. Remove response envelope from translation.ts

```typescript
// features/reading/schemas/translation.ts
// DELETE: makeApiResponseSchema, translateResponseSchema, apiErrorResponseSchema
// KEEP: translationDataSchema, TranslationSelection interface
```

### 2. Simplify study-workspace.tsx client

```typescript
// Before:
const parsed = translateResponseSchema.safeParse(json);
if (!parsed.success || !parsed.data.success) throw new Error();

// After:
if (json.error) throw new Error(json.error || "Translation failed");
const data = json.data;
```

### 3. Verify no other response schemas

Check for other `makeApiResponseSchema` usages — from grep results, only `translateResponseSchema` exists.

## Files

- **Delete**: `features/reading/schemas/translation.ts` — remove envelope code, keep data schema + interface
- **Modify**: `src/app/[locale]/(dashboard)/study/_components/study-workspace.tsx`

## Result

- No response envelope for internal APIs
- Input validation schemas stay
- Client uses simple error check
- No third-party response validation needed (no external APIs called)
