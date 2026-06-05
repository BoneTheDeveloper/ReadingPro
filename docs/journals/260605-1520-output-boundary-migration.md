# Output Boundary Migration

Implemented Issue 46 Part 2 response-boundary contracts across product JSON
routes. Shared Zod response schemas now cover translation/vocabulary,
dictionary, study/progress/session/cards, upload, and study-chat history.
Browser consumers parse `response.json()` as `unknown` before using route data.

Important decisions:

- Kept server response validation out of hot route paths; contract tests and
  frontend parsing enforce the boundary.
- Mapped card review and study session API responses to minimal DTOs so user
  ownership fields and raw Prisma date objects are not public contracts.
- Kept `POST /api/study-chat` as the documented streaming exception; its JSON
  error envelopes remain tested separately from the UI message stream.
- Removed upload storage paths from the public upload success DTO.

Verification:

- `pnpm exec vitest run tests/vitest/integration/api`
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test`

All final verification commands passed.
