# Code Standards

For source layout and features, see `codebase-summary.md`.
For observability, see `Architecture/observability.md`.

## Layer Rules

| Layer | Location | Rule |
|-------|----------|------|
| Data schema | `features/<f>/schemas/` | Domain data shape only. No HTTP/envelope. |
| Response contract | `features/<f>/schemas/` | `makeApiResponseSchema(dataSchema)` |
| Error class | `lib/errors/` or `features/<f>/errors/` | Throws domain errors |
| Service | `features/<f>/services/` | Business logic. Throws errors. No HTTP. |
| Repository | `features/<f>/db/` | Prisma/SQL only. Never imports schemas. |
| Route | `app/api/**/route.ts` | Uses `withRoute()`. Returns envelope. |

## Error Handling

**Domain errors** in `lib/errors/`:

| Error | HTTP | Use When |
|-------|------|----------|
| `NotFoundError` | 404 | Resource missing or not owned |
| `UnauthorizedError` | 401 | Authentication required |
| `ValidationError` | 400 | Business validation failed |
| `ConflictError` | 409 | Resource conflict |
| `AppError` | base | Base for feature errors |

**Feature errors** extend base errors in `features/<f>/errors/`.

Service throws domain errors. Route catches via `toHttp()`.

## API Response Envelope

```typescript
// Success: { success: true, data: <result> }
// Error: { success: false, error: "message" }

// Factory: makeApiResponseSchema(dataSchema)
```

## Naming

| Item | Pattern |
|------|---------|
| Files | kebab-case |
| Data schema | `<name>Schema` |
| Response contract | `<name>ResponseSchema = makeApiResponseSchema(<name>Schema)` |
| Error class | `<Feature>Error` hoặc extends base |

## Core Rules

1. Schema is source of truth. No parallel types.
2. Service owns DTO building.
3. Routes delegate. No repository access.
4. Clients validate. Always `safeParse`.
5. Domain errors are typed. Service throws, route catches.
6. Pass logger to services. Preserves `requestId`.
7. No cross-feature re-exports.
8. `lib/errors/` is HTTP-free. No imports from `lib/http/`.
9. Use `withRoute()` for non-streaming routes.

## Type Safety

- Derive types from `z.infer<typeof schema>`
- Never use `as` casts
- Service return types match DTO types exactly
