# Vocabulary Sets API

Manual and auto (DAILY/WEEKLY) collections of vocabulary items. Daily/weekly sets are
created lazily by the save path; manual sets are user-created here.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/vocabulary/sets` | List user's sets with item counts |
| `POST` | `/api/vocabulary/sets` | Create a manual set |
| `PATCH` | `/api/vocabulary/sets/[id]` | Update set name |
| `DELETE` | `/api/vocabulary/sets/[id]` | Delete set |
| `POST` | `/api/vocabulary/sets/[id]/items` | Add item(s) to set |
| `DELETE` | `/api/vocabulary/sets/[id]/items/[itemId]` | Remove item from set |

## List Vocabulary Sets

### 1. Purpose

List the authenticated user's vocabulary sets with item counts.

### 2. Method + path

```http
GET /api/vocabulary/sets
```

### 3. Request input

Query params:

```ts
{
  type?: "MANUAL" | "DAILY" | "WEEKLY";
}
```

### 4. Success response

```ts
{
  success: true;
  data: VocabularySetWithCount[];
}
```

```ts
{
  id: string;
  userId: string;
  name: string;
  type: "MANUAL" | "DAILY" | "WEEKLY";
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { items: number };
}
```

Sets are ordered by `createdAt` descending.

### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `401` | Missing auth |
| `500` | Unexpected list failure |

## Create Manual Set

### 1. Purpose

Create a user-named vocabulary set (MANUAL type).

### 2. Method + path

```http
POST /api/vocabulary/sets
```

### 3. Request input

```ts
{
  name: string;  // 1-100 chars, trimmed
}
```

### 4. Success response

```ts
{
  success: true;
  data: VocabularySet;
}
```

### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid JSON payload or invalid name |
| `401` | Missing auth |
| `500` | Unexpected creation failure |

## Update Set Name

### 1. Purpose

Rename a manual vocabulary set.

### 2. Method + path

```http
PATCH /api/vocabulary/sets/[id]
```

### 3. Request input

```ts
{
  name: string;  // 1-100 chars, trimmed
}
```

### 4. Success response

```ts
{
  success: true;
  data: VocabularySet;  // updated set
}
```

### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid JSON payload or invalid name |
| `401` | Missing auth |
| `404` | Vocabulary set not found or not owned by user |
| `500` | Unexpected update failure |

## Delete Set

### 1. Purpose

Delete a vocabulary set. Cascades to set item membership but does not delete the
vocabulary items themselves.

### 2. Method + path

```http
DELETE /api/vocabulary/sets/[id]
```

### 3. Request input

Path param: `id` (UUID).

### 4. Success response

```ts
{ success: true }
```

### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `401` | Missing auth |
| `404` | Vocabulary set not found or not owned by user |
| `500` | Unexpected delete failure |

## Add Items to Set

### 1. Purpose

Add one or more vocabulary items to a set. Idempotent — duplicate additions are silently
ignored via unique constraint.

### 2. Method + path

```http
POST /api/vocabulary/sets/[id]/items
```

### 3. Request input

```ts
{
  itemIds: string[];  // 1-50 UUIDs
}
```

### 4. Success response

```ts
{ success: true }
```

### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid JSON payload or invalid itemIds |
| `401` | Missing auth |
| `404` | Vocabulary set not found or not owned by user |
| `500` | Unexpected failure |

### 6. Notes

- All additions are processed in parallel. Individual unique-constraint violations are
  caught and silently resolved (idempotent).
- Maximum 50 items per request.

## Remove Item from Set

### 1. Purpose

Remove a vocabulary item from a set. Does not delete the vocabulary item itself.

### 2. Method + path

```http
DELETE /api/vocabulary/sets/[id]/items/[itemId]
```

### 3. Request input

Path params: `id` (set UUID), `itemId` (vocabulary item UUID).

### 4. Success response

```ts
{ success: true }
```

### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `401` | Missing auth |
| `404` | Vocabulary set not found or not owned by user |
| `500` | Unexpected failure |

## Auto-Set Generation

| Set Type | When Created | Name Format | Period |
|----------|-------------|-------------|--------|
| DAILY | First save of the day | "June 8, 2026" | periodStart = start of day, periodEnd = end of day |
| WEEKLY | First save of the week | "Jun 2 – Jun 8, 2026" | periodStart = Monday, periodEnd = Sunday |

Both sets are created lazily on the first save that needs them. The
`@@unique([userId, type, periodStart, periodEnd])` constraint ensures idempotency.

## Implementation

- Routes: `src/app/api/vocabulary/sets/route.ts`, `src/app/api/vocabulary/sets/[id]/route.ts`,
  `src/app/api/vocabulary/sets/[id]/items/route.ts`,
  `src/app/api/vocabulary/sets/[id]/items/[itemId]/route.ts`
- Set queries: `src/server/db/vocabulary-set-queries.ts`
