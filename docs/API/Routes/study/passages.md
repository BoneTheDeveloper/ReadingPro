# Study Passages API

Part of the **Study** domain. See [Study domain index](README.md).

## Purpose

Create, delete, and simplify reading passages owned by the authenticated user.
Passages are the core content unit the rest of the Study domain (chat, questions,
artifacts, sessions) operates on.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/study/passages` | Create a passage from raw text. |
| `DELETE` | `/api/study/passages/[id]` | Delete a passage owned by the user. |
| `POST` | `/api/study/passages/[id]/simplify` | Generate a simplified version of the passage. |

## Auth And Ownership

- Authenticated user-owned read/write.
- All routes authenticate with `getAuthenticatedUser()`.
- Delete and simplify operate only on passages owned by the authenticated user.

## Create Passage

### Request

```ts
{
  text: string;   // min 50 chars
  title: string;  // required
  sourceType?: "TEXT" | "PDF" | "URL" | "YOUTUBE"; // non-PDF coerced to TEXT
}
```

### Success response

```ts
{
  success: true;
  data: PassageDto;
}
```

`PassageDto`:

```ts
{
  id: string;
  title: string;
  content: string;
  originalLevel: string | null;
  simplifiedContent: string | null;
  simplifiedLevel: string | null;
  wordCount: number;
  createdAt: number;
}
```

### Error cases

| Status | Meaning |
|--------|---------|
| `400` | Validation failure (text too short, missing title) |
| `401` | Missing auth |
| `500` | Unexpected create failure |

## Delete Passage

`DELETE /api/study/passages/[id]` — path param `id` (UUID).

### Success response

```ts
{ success: true }
```

### Error cases

| Status | Meaning |
|--------|---------|
| `401` | Missing auth |
| `500` | Unexpected delete failure |

## Simplify Passage

`POST /api/study/passages/[id]/simplify` — path param `id` (UUID). No request body.

### Success response

```ts
{
  success: true;
  data:
    | { simplifiedContent: string; simplifiedLevel: string }
    | { skipped: true };  // already simplified or nothing to do
}
```

### Error cases

| Status | Meaning |
|--------|---------|
| `400` | Passage service error (e.g. passage not eligible) |
| `401` | Missing auth |
| `500` | Simplification failure |

## Implementation References

- Routes: `src/app/api/study/passages/route.ts`, `src/app/api/study/passages/[id]/route.ts`, `src/app/api/study/passages/[id]/simplify/route.ts`
- Create service: `src/server/modules/upload/passage-create/passage-create.service.ts`
- Simplify service: `src/server/modules/study/passage/passage-study.service.ts`
- Delete query: `src/server/db/passage-queries.ts`
- Shared schema: `src/contracts/study/passage-schema.ts`
- Client: `src/features/study/api-client/passages-client.ts`
