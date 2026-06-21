# Vocabulary Review API

The spaced-repetition surface: submit review outcomes and manually override mastery
status.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/vocabulary/[id]/review` | Submit a spaced-repetition review outcome |
| `PATCH` | `/api/vocabulary/[id]/status` | Update item status (manual override) |

## Review Vocabulary Item

### 1. Purpose

Submit a spaced-repetition review outcome for a vocabulary item. Advances the item's
mastery status and schedules the next review using the lightweight spaced-repetition
engine (see [Spaced Repetition](#spaced-repetition)).

### 2. Method + path

```http
POST /api/vocabulary/[id]/review
```

### 3. Request input

```ts
{
  isCorrect: boolean;
}
```

### 4. Success response

```ts
{
  success: true;
  data: VocabularyItem;  // with updated status, nextReviewAt, lastReviewedAt
}
```

### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid JSON payload or missing `isCorrect` |
| `401` | Missing auth |
| `404` | Vocabulary item not found or not owned by user |
| `500` | Unexpected review failure |

## Update Vocabulary Status

### 1. Purpose

Manually override a vocabulary item's mastery status. Used from the vocabulary page to
promote or reset items.

### 2. Method + path

```http
PATCH /api/vocabulary/[id]/status
```

### 3. Request input

```ts
{
  status: "NEW" | "LEARNING" | "MASTERED";
}
```

### 4. Success response

```ts
{
  success: true;
  data: VocabularyItem;  // updated item
}
```

### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid JSON payload or invalid status value |
| `401` | Missing auth |
| `404` | Vocabulary item not found or not owned by user |
| `500` | Unexpected update failure |

## Spaced Repetition

Vocabulary review scheduling is powered by the lightweight spaced-repetition engine
(`src/server/modules/spaced-repetition`). This is a deliberately simple interval model for
lightweight content (per ADR 0005) — not a full SM-2 implementation.
`POST /api/vocabulary/[id]/review` is its only HTTP surface.

`simpleSchedule(currentStatus, isCorrect)` transitions are:

| Current status | `isCorrect` | Next status | Next review |
|----------------|-------------|-------------|-------------|
| `NEW` | `true` | `LEARNING` | +1 day |
| `LEARNING` | `true` | `MASTERED` | none (no further review) |
| any | `false` | `LEARNING` | +1 day |

On review, the item's `status`, `nextReviewAt`, and `lastReviewedAt` are updated.

## Implementation

- Routes: `src/app/api/vocabulary/[id]/review/route.ts`,
  `src/app/api/vocabulary/[id]/status/route.ts`
- Spaced-repetition engine: `src/server/modules/spaced-repetition/scheduler.ts`
- Item queries: `src/server/db/vocabulary-queries.ts`
