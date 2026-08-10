# Research Report: API Error Handling Patterns

## Executive Summary

Industry-standard error handling in HTTP APIs follows a clear pattern across frameworks:

1. **Expected errors (4xx)**: Return early with error response — never throw, never log to error trackers
2. **Unexpected errors (5xx)**: Throw and catch centrally, log for debugging, sanitize response
3. **Error format**: RFC 7807 Problem Details (or similar) for machine-readable errors

The Fastify documentation explicitly states: *"Errors with a statusCode below 500 were raised deliberately... do not describe it to the client."* This is the industry consensus.

## Key Findings

### 1. Express Pattern (Node.js Standard)

```javascript
// Route: return for expected errors
app.get('/resource', (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ error: 'id required' }); // Return, don't throw
  }
  // business logic...
});

// Async: catch and forward to error middleware
app.get('/data', async (req, res, next) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (err) {
    next(err); // Forward to error middleware
  }
});

// Error middleware: catches thrown errors
app.use((err, req, res, next) => {
  if (err.status || err.statusCode < 500) {
    return res.status(err.status || 400).json({ error: err.message });
  }
  // Only log unexpected errors
  console.error({ err, url: req.url, method: req.method });
  res.status(500).json({ error: 'Internal Server Error' });
});
```

### 2. Fastify Pattern (Modern Best Practice)

```javascript
app.setErrorHandler(function (error, request, reply) {
  // Errors below 500 are DELIBERATE - return as-is, no logging
  if (error.validation || (error.statusCode && error.statusCode < 500)) {
    return reply.send(error);
  }

  // Only unexpected errors get logged
  this.log.error({ err: error }, 'unhandled error');
  reply.status(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'Internal Server Error'
  });
});
```

### 3. RFC 7807 Problem Details (Industry Standard Format)

```json
{
  "type": "https://example.com/probs/validation",
  "title": "Validation Failed",
  "status": 400,
  "detail": "The request body contains invalid fields",
  "instance": "/api/users"
}
```

Adopted by: Microsoft ASP.NET Core, Spring Framework, GitHub API, Stripe, and most major APIs.

### 4. The Key Distinction

| Error Type | HTTP Status | Pattern | Logging | Sentry |
|------------|-------------|---------|---------|--------|
| Validation input | 400 | `return Response.json(...)` | ❌ | ❌ |
| Auth missing | 401 | `return Response.json(...)` | ❌ | ❌ |
| Resource not found | 404 | `return Response.json(...)` | ❌ | ❌ |
| Domain error | 4xx | `throw AppError` | ⚠️ info | ❌ |
| DB connection | 500 | `throw` | ✅ error | ✅ |
| Null pointer | 500 | `throw` | ✅ error | ✅ |

## Comparative Analysis

### Throw vs Return

| Approach | Pros | Cons |
|----------|------|------|
| **Return early** | Clear intent, no error tracker noise, faster | Manual response building |
| **Throw everything** | Consistent pattern, centralized handling | Sentry/noise filled with user errors, slower (stack trace) |

**Industry consensus**: Return for expected (4xx), throw for unexpected (5xx).

### Centralized vs Inline Error Handling

| Pattern | Used By | Best For |
|---------|---------|----------|
| Error middleware | Express, Koa | Simple apps, quick iteration |
| Error handler function | Fastify, Next.js | Type-safe, framework-integrated |
| Result/Either monad | Functional languages | Complex domain logic |

## Implementation Recommendations

### For Your Next.js App

```typescript
// Pre-checks in route: RETURN, don't throw
export const DELETE = withErrorHandling("ai-chat", async (req) => {
  const session = await requireApiSession();
  if (!session) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Please log in" } },
      { status: 401 }
    );
  }

  const passageId = searchParams.get("passageId");
  if (!passageId) {
    return Response.json(
      { error: { code: "VALIDATION", message: "passageId is required" } },
      { status: 400 }
    );
  }
});

// Domain errors in service: THROW
export async function deleteVocabularyItemForUser(userId: string, id: string) {
  const existing = await prisma.vocabularyItem.findFirst({ where: { id, userId } });
  if (!existing) throw new NotFoundError("VocabularyItem", id); // Domain error
  await prisma.vocabularyItem.delete({ where: { id } });
}
```

### Your withErrorHandling Should Distinguish

```typescript
// Current: treats all thrown errors the same
// Better: distinguish expected vs unexpected

if (isAppError(error)) {
  if (error.isExpected) {
    // 4xx errors: just return, no logging
    return error.toResponse();
  }
  // 5xx errors: log and sanitize
  logger.error({ err: error }, error.message);
  Sentry.captureException(error);
  return Response.json(internalErrorBody(), { status: 500 });
}
```

## Conclusion

**Your instinct is correct.** Industry standard is:

- **Return** for pre-checks (auth, validation, simple existence checks)
- **Throw** for domain errors in services
- **No Sentry logging** for expected 4xx errors
- **Log everything** for 5xx unexpected errors

This keeps error trackers meaningful and reduces noise.

## Resources

- [RFC 7807 - Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc7807)
- [Express Error Handling](https://expressjs.com/en/guide/error-handling.html)
- [Fastify Error Handling](https://fastify.dev/docs/latest/Reference/Errors/)
- [RFC 9457 - Updated Problem Details](https://www.rfc-editor.org/rfc/rfc9457)
