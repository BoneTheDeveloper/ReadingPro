# Study Session API Feature

## Endpoints

### Create Study Session API

#### 1. Purpose

Create a study session for the authenticated user. The session may be tied to a
passage when `passageId` is provided.

#### 2. Method + path

```http
POST /api/study-session
```

#### 3. Request input

Request body:

```ts
{
  passageId?: string;  // Must be valid UUID if provided
}
```

#### 4. Success response

```ts
{
  success: true;
  data: StudySession;
}
```

`StudySession`:

```ts
{
  id: string;
  passageId: string | null;
  startedAt: string;        // ISO date string
  completedAt: string | null;
  cardsReviewed: number;
  newCards: number;
  correctCount: number;
  incorrectCount: number;
  accuracyRate: number | null;
}
```

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid request body, malformed JSON, or invalid UUID format |
| `401` | Missing auth |
| `500` | Unexpected session creation failure |

#### 6. Notes about cache / auth / boundaries

- Route requires authenticated user.
- No client or server cache is expected.
- The route creates a new session with `startedAt`.

### Complete Study Session API

#### 1. Purpose

Complete a study session and persist aggregate quiz/review counts.

#### 2. Method + path

```http
PATCH /api/study-session
```

#### 3. Request input

Request body:

```ts
{
  sessionId: string;   // Must be valid UUID
  cardsReviewed?: number;
  correctCount?: number;
  incorrectCount?: number;
}
```

#### 4. Success response

```ts
{
  success: true;
  data: StudySession;
}
```

`StudySession`:

```ts
{
  id: string;
  passageId: string | null;
  startedAt: string;        // ISO date string
  completedAt: string | null;
  cardsReviewed: number;
  newCards: number;
  correctCount: number;
  incorrectCount: number;
  accuracyRate: number | null;
}
```

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid request body, malformed JSON, or invalid UUID format |
| `401` | Missing auth |
| `500` | Unexpected session update failure |

#### 6. Notes about cache / auth / boundaries

- Route requires authenticated user.
- Only sessions owned by the authenticated user should be updated.
- Missing count fields default to `0`.
- Completion sets `completedAt` server-side.

### Due Cards API

#### 1. Purpose

Fetch card reviews due for the authenticated user.

#### 2. Method + path

```http
GET /api/cards/due
```

#### 3. Request input

None.

#### 4. Success response

```ts
{
  success: true;
  data: CardReview[];
}
```

`CardReview` includes nested question and passage data needed by the review UI.
It is a public DTO and does not expose ownership fields such as `userId`.
Date fields are ISO strings.

```ts
{
  id: string;
  questionId: string;
  qualityRating: number;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewDate: string;
  reviewedAt: string;
  question?: {
    id: string;
    passageId: string;
    questionText: string;
    options: { id: string; text: string }[];
    correctAnswer: string;
    sourceText: string;
    sourceLine: number;
    explanation: string;
    questionType: string;
    difficulty: number;
    passage?: { id: string; title: string };
  };
}
```

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `401` | Missing auth |
| `500` | Unexpected due-card fetch failure |

#### 6. Notes about cache / auth / boundaries

- Route requires authenticated user.
- Returns up to 20 due cards.
- Results are ordered by `nextReviewDate` ascending.
- No client or server cache is expected.

### Review Card API

#### 1. Purpose

Submit a recall quality rating and update spaced-repetition scheduling with the
SM-2 algorithm.

#### 2. Method + path

```http
POST /api/cards/review
```

#### 3. Request input

Request body:

```ts
{
  cardReviewId: string;    // Must be valid UUID
  qualityRating: number;  // 0-5, validated via Zod schema
}
```

Quality rating meanings:

| Quality | Meaning |
|---------|---------|
| 0 | Complete blackout |
| 1 | Incorrect but recognized |
| 2 | Incorrect but answer seemed easy to recall |
| 3 | Correct with serious difficulty |
| 4 | Correct with hesitation |
| 5 | Perfect recall |

#### 4. Success response

```ts
{
  success: true;
  data: CardReview;
}
```

`CardReview` includes updated `easeFactor`, `intervalDays`, `repetitions`, and
`nextReviewDate`. It uses the same public DTO as `GET /api/cards/due`.

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Missing card review id, quality rating outside `0-5`, malformed JSON, or invalid UUID format |
| `401` | Missing auth |
| `500` | Unexpected review update failure |

#### 6. Notes about cache / auth / boundaries

- Route requires authenticated user.
- Only card reviews owned by the authenticated user should be updated.
- No client or server cache is expected.
- Quality ratings below `3` reset repetition progress.

SM-2 calculation:

```
quality >= 3:
  repetitions += 1
  easeFactor = max(1.3, easeFactor + 0.1 - (5-quality) * (0.08 + (5-quality) * 0.02))
  intervalDays = 1 if rep==1, 6 if rep==2, round(prevInterval * easeFactor) if rep>2

quality < 3:
  repetitions = 0
  intervalDays = 1
```

### Progress Stats API

#### 1. Purpose

Fetch aggregate progress statistics for the authenticated user.

#### 2. Method + path

```http
GET /api/progress/stats
```

#### 3. Request input

None.

#### 4. Success response

```ts
{
  success: true;
  data: ProgressStats;
}
```

`ProgressStats`:

```ts
{
  totalCards: number;
  matureCards: number;
  dueCards: number;
  todayReviews: number;
  streakDays?: number;
}
```

| Metric | Definition |
|--------|------------|
| `totalCards` | Total `CardReview` records for user |
| `matureCards` | Reviews with `intervalDays >= 21` |
| `dueCards` | Reviews where `nextReviewDate <= now` |
| `todayReviews` | Reviews where `reviewedAt >= midnight today` |
| `streakDays` | Consecutive days with review activity, when available |

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `401` | Missing auth |
| `500` | Unexpected progress stats failure |

#### 6. Notes about cache / auth / boundaries

- Route requires authenticated user.
- Stats are computed from the user's card review records.
- No client or server cache is expected.
