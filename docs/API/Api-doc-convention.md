# API Documentation Convention

## Purpose

Use this convention for API feature files in `docs/API/Routes/*.md`.

Each API feature doc should focus on HTTP route contracts and API-specific
behavior. Keep the convention simple: write enough for another developer to
understand boundaries, inputs, outputs, server behavior, and operational notes
without reading route code first.

## API Feature Doc Shape

Use these top-level sections when they help the API feature. They are not all
mandatory, but keep this order when present:

```md
# <Feature / Route Family> API Feature

## Scope
## Endpoints
## Server Logic
## Observability
## Boundaries / Out Of Scope
```

Guidance:

- `Scope`: what this API feature owns and does not own.
- `Endpoints`: API contracts using the six-section endpoint layout below.
- `Server Logic`: resolution order, data access order, provider calls, fallback.
- `Observability`: logs, Sentry spans, metrics, sensitive-data rules.
- `Boundaries / Out Of Scope`: features deliberately excluded from this API feature.

Use only sections that add meaning. Avoid empty boilerplate.
Do not include file maps, frontend component docs, UI component props, or
general product user journeys.

## Endpoint Layout

Inside `## Endpoints`, every HTTP route should use this exact six-section shape:

```md
### <Name> API

#### 1. Purpose
#### 2. Method + path
#### 3. Request input
#### 4. Success response
#### 5. Error response
#### 6. Notes about cache / auth / boundaries
```

Simple rules:

- Use `### <Name> API` for each endpoint.
- Use the six `####` headings exactly.
- If a route has no request input, write `None.`
- Prefer TypeScript object shapes for request and response contracts.
- Keep implementation file paths out of endpoint contracts.
- Put route internals in `Server Logic`, not inside endpoint contracts.

## Endpoint Template

````md
### <Name> API

#### 1. Purpose

<What this route is used for. Mention the most important boundary.>

#### 2. Method + path

```http
<METHOD> /api/<path>
```

#### 3. Request input

<Query params / Path params / Request body / FormData / Headers / None.>

```ts
{
  // request shape
}
```

#### 4. Success response

```ts
{
  success: true;
  data: ResponseDto;
}
```

`ResponseDto`:

```ts
{
  // response shape
}
```

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid request |
| `401` | Missing auth |
| `500` | Unexpected failure |

#### 6. Notes about cache / auth / boundaries

- Route requires authenticated user.
- Add cache, auth, and boundary notes here.
````

## Notes Section

Use section 6 for operational facts callers need:

- Auth requirement.
- Cache behavior and cache key.
- Result limits.
- Provider/fallback behavior.
- Sensitive logging constraints.
- Important route boundaries.

## Related Docs

- [API Implementation Conventions](./Api-impliment-conventions.md)
