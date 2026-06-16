# Vitest Test Suite

## Commands

```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report (80% line threshold)
```

Config: `tests/vitest/vitest.config.ts`

## Structure

```
tests/vitest/
├── fixtures/        # Shared test data (users, passages, vocabulary, etc.)
├── helpers/         # Reusable test utilities (API helpers, assertions, DB helpers)
├── mocks/           # Module-level mock definitions (db, ai, sentry, logger)
├── setup/           # Global vitest setup
└── integration/     # Integration tests
    ├── api/         # API route tests
    ├── services/    # Service layer tests
    ├── actions/     # Server action tests
    └── components/  # Component integration tests
```

## Conventions

### File Naming
- API route tests: `{feature}-route.test.ts` or `{feature}-routes.test.ts`
- Service tests: `{service-name}.test.ts`
- Component tests: `{component-name}.integration.test.tsx`

### Writing API Route Tests

1. **Imports** — Use shared helpers and fixtures:

```typescript
import { createJsonRequest } from "../../helpers/api";
import { expectApiSuccessPayload } from "../../helpers/assertions";
import { expectJsonError } from "../../helpers/api-test-helpers";
import { userProfileFixture, vocabularyItemFixture } from "../../fixtures";
```

2. **Mock setup** — Use `vi.hoisted()` + `vi.mock()` at module level:

```typescript
const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  myQueryFunction: vi.fn(),
}));

vi.mock("@/server/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {
    constructor() { super("Authentication required"); this.name = "AuthenticationRequiredError"; }
  },
}));

vi.mock("@/lib/db/my-queries", () => ({
  myQueryFunction: routeMocks.myQueryFunction,
}));
```

3. **beforeEach** — Reset mocks and set defaults:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
});
```

4. **Test patterns**:

```typescript
// Success
const response = await myRoute(createJsonRequest(body));
expect(response.status).toBe(200);
expectApiSuccessPayload(await response.json());

// Error
await expectJsonError(response, 401, "Authentication required.");
```

### When to Partial Mock

Use `importOriginal` when the test file also tests routes that depend on other exports from the same module:

```typescript
vi.mock("@/server/db/translation-queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/translation-queries")>();
  return { ...actual, getOwnedTranslationSource: routeMocks.getOwnedTranslationSource };
});
```

### Fixtures

Shared test data lives in `fixtures/`. Import from the barrel export:

```typescript
import { userProfileFixture, passageFixture, vocabularyItemFixture, VOCABULARY_ITEM_ID } from "../../fixtures";
```

### Mocks

Module-level mocks in `mocks/`:

| File | Purpose |
|------|---------|
| `db.ts` | Prisma client mock with all models + `resetDbMock()` |
| `ai.ts` | AI SDK mocks (`generateObject`, `streamText`) + `resetAiMocks()` |
| `sentry.ts` | Sentry error tracking + `resetSentryMocks()` |
| `logger.ts` | Logger mock + `createRequestLogger()` |

### Helpers

| File | Key Exports |
|------|-------------|
| `api.ts` | `createJsonRequest()`, `parseJsonResponse()`, `readJsonResponse()` |
| `assertions.ts` | `expectApiSuccessPayload()`, `expectApiErrorPayload()` |
| `api-test-helpers.ts` | `expectJsonError()` — status + error message check |
| `db.ts` | `resetAllDbMocks()`, `seedCommonDbMocks()` |
| `ui.tsx` | `renderWithUser()` for React component tests |
