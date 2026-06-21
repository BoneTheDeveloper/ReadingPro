# API Documentation Convention

## Purpose

Use this convention for API feature files under `docs/API/Routes/`.

## Canonical Domain Taxonomy

Routes and their docs are organized by **domain**. Each domain maps 1:1 to a
server bounded context in `src/server/modules/`, plus a read-only Progress domain
and non-domain utility routes. When adding a route, place it in the domain that
owns its server module — do not invent new top-level URL prefixes for what is
really a sub-resource of an existing domain.

| Domain | Server module | Doc location |
|--------|---------------|--------------|
| Upload | `modules/upload` | `Routes/upload.md` |
| Study | `modules/study` | `Routes/study/` (file per sub-resource) |
| Translation | `modules/translation` | `Routes/translation.md` |
| Dictionary | `modules/dictionary` | `Routes/dictionary.md` |
| Vocabulary | `modules/vocabulary` (+ `modules/spaced-repetition` engine) | `Routes/vocabulary/` (file per sub-resource) |
| Progress | reporting over study sessions | `Routes/progress.md` |
| Utility | none (infra/dev) | listed in `api-index.md` |

Spaced-repetition is an engine, not its own domain — document it inside the
Vocabulary domain where it surfaces (`POST /api/vocabulary/[id]/review`).

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
