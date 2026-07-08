# Code Standards

For source layout, features, and API inventory, see `codebase-summary.md`.
For observability patterns, see [`observability-architecture.md`](./Architecture/observability-architecture.md).

## Layered Architecture

API data flows through fixed layers inside feature slices (`src/features/<feature>/`):

```
Client → API Route → Service → Repository → DB
Client ← Response ← Envelope ← DTO ←
```

### Layers

| Layer | Location | Key Rule |
|-------|----------|----------|
| Schema | `features/<f>/schemas/*.schema.ts` | Types from `z.infer<typeof schema>`. Files use `.schema.ts` suffix. |
| Service | `features/<f>/services/*-service.ts` | Business logic. Converts DB output to DTO. Throws domain errors. |
| Repository | `features/<f>/db/*-repository.ts` | Prisma/SQL only. Never imports schemas. |
| API Route | `app/api/**/route.ts` | Parses request → calls one service → wraps in envelope. Never touches DB. |
| Client | `features/<f>/*-client.ts` | Always `safeParse` responses. No `as Type` casts. |

## Envelope Format

```typescript
// Success
{ success: true, data: <SchemaType> }

// Error
{ error: "Human-readable message", code?: "ERROR_CODE" }
```

## Naming Conventions

| Item | Pattern |
|------|---------|
| Files | kebab-case (`lookup-service.ts`, `dictionary-client.ts`) |
| Entity schema | `<name>Schema` + `type <Name>Dto = z.infer<...>` |
| Request schema | `<entity>RequestSchema` |
| Response schema | `<entity>ResponseSchema` = `makeResponseSchema(<entity>Schema)` |
| Error class | `<Feature>ServiceError` |

All schemas use `.strict()` to catch extra fields.

## Core Rules

1. **Schema is source of truth.** No parallel hand-written types.
2. **Service owns DTO building.** Prisma changes → compile fails at boundary.
3. **Routes delegate.** One service call; no repository access.
4. **Clients validate.** Always `safeParse`; never blind casts.
5. **Domain errors are typed.** Service throws specific errors; route catches with `instanceof`.
6. **Pass logger to services.** Don't create loggers inside services — preserves `requestId`.
7. **No cross-feature re-exports.** Types stay in their owning feature.

## Error Handling

- `NotFoundError` — resource missing or not owned by caller
- `ZodError` → 400 with parsed message
- Service errors → handled via `instanceof` before `toHttp`
- Everything else → `toHttp(error, log, MODULE)` → log + Sentry + 500

## Type Safety

- Derive types only from `z.infer<typeof schema>`
- Never use `Omit<PrismaModel, ...>` for DTOs
- Service return types must match DTO types exactly
