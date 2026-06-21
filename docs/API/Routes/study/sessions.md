# Study Sessions API

> Aggregate study statistics live in the separate **Progress** domain
> ([progress.md](../progress.md)), not here. A study session is a
> presence/heartbeat lifecycle record only.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/study/sessions` | Ensure an active study session for the user. |

## Auth And Ownership

- Authenticated user-owned write.
- Requires an authenticated user; operates only on the user's sessions.

## Create / Ensure Session

`POST /api/study/sessions` ensures there is an active study session for the
authenticated user. It reuses the newest open session when still fresh and
otherwise creates a new session window.

### Request

```ts
{}
```

### Success response

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
  startedAt: string;          // ISO date string
  completedAt: string | null;
}
```

### Error cases

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid request body or malformed JSON |
| `401` | Missing auth |
| `500` | Unexpected session lookup or creation failure |

### Boundaries

- The route closes stale open sessions lazily using the server clock and updates
  `lastActivityAt` on the returned session row.
- `ensureActiveSession` serializes per-user with a transaction-level advisory lock
  so concurrent tabs/devices collapse to one open session.
- `StudySession` is a presence/heartbeat lifecycle record only; quiz scoring lives
  in a `QuizResult` (1:1 with the quiz `StudioArtifact`), not in the session.
- No client or server cache is expected.

## Observability

- Request logger / Sentry route tag: `api:study:sessions`
- Span: `db:session-ensure-active`
- Logged request path: `POST /api/study/sessions`

## Implementation References

- Route: `src/app/api/study/sessions/route.ts`
- Session queries: `src/server/db/study-session-queries.ts`
- Heartbeat client: `src/features/study/hooks/use-study-session-heartbeat.ts`
