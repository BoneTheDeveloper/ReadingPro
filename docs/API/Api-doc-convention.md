# API Documentation Convention

## Purpose

Use this convention for API feature files under `docs/API/Routes/`.

## Required Shape

Each feature route doc should include:

1. Purpose
2. Routes table
3. Auth and ownership rules
4. Request contract
5. Response contract
6. Side effects
7. Error cases
8. Implementation references
9. Tests or verification notes

## Route Table

```markdown
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/example` | Creates example data. |
```

## Response Style

JSON success:

```json
{ "success": true, "data": {} }
```

JSON error:

```json
{ "error": "Message" }
```

Streaming routes must explicitly document their stream response instead of forcing the JSON response format.

## Ownership Categories

Docs must state whether the route is:

- Public.
- Authenticated shared-data read.
- Authenticated user-owned read/write.
- Development/test only.

## Related Docs

- [API Implementation Conventions](api-implementation-conventions.md)
- [API Index](api-index.md)
