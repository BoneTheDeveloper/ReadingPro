# MVP Hardening Phase 2

Implemented API contract and ownership coverage for the MVP-hardening plan.

Key changes:

- Added focused route contract tests for upload, study chat, study session, cards, and progress APIs.
- Normalized auth failures to `401` on routes that previously collapsed them into generic `500` responses.
- Mapped card review and study-session owned-resource misses to `404` while leaving request validation on `400`.
- Kept success DTO schemas stable and preserved `POST /api/study-chat` as the streaming success-shape exception.
- Updated route contract docs and synced phase 2 plan status.

Verification:

- `pnpm exec vitest --config tests/vitest/vitest.config.ts run tests/vitest/integration/api`
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test`

All verification commands passed.
