# Research: Test Organization, Naming & What to Write

_Date: 2026-06-21_

---

## TL;DR

This project's test structure is already correct in concept. Two actionable fixes:
1. Flatten the single-file subdirs in `unit/` (no nesting without 2+ files).
2. Use the decision table below before writing any new test.

---

## Directory Structure

### Industry consensus: dedicated dir mirroring source

Both "co-located" (next to source) and "dedicated `tests/`" are valid. Co-located wins for discoverability; dedicated dir wins for keeping `src/` clean and separating test infra (fixtures, helpers, mocks).

This project chose dedicated dir — correct call given the test infra volume (`fixtures/`, `helpers/`, `mocks/`, `setup/`).

### Current structure vs best practice

```
tests/vitest/
├── unit/                  ✅ pure logic, no I/O
│   ├── observability/     ⚠️  single file — premature nesting
│   │   └── sentry-logger.test.ts
│   ├── performance/       ⚠️  single file — premature nesting
│   │   └── benchmark-utils.test.ts
│   └── vocabulary-normalization.test.ts
├── integration/           ✅ api/, services/, components/ all multi-file → nesting justified
├── smoke/                 ✅ single infra smoke test, flat is fine
├── fixtures/              ✅
├── helpers/               ✅
├── mocks/                 ✅
└── setup/                 ✅
```

**Recommendation**: flatten `unit/` — subfolders only when ≥2 related files exist.

```
tests/vitest/unit/
├── vocabulary-normalization.test.ts
├── sentry-logger.test.ts          ← move up from observability/
└── benchmark-utils.test.ts        ← move up from performance/
```

---

## Naming Conventions

| Test type | Suffix | Example |
|-----------|--------|---------|
| Unit (pure logic) | `.test.ts` | `vocabulary-normalization.test.ts` |
| Integration (API route) | `.test.ts` | `vocabulary-save-route.test.ts` |
| Integration (service) | `.test.ts` | `upload-workflow.test.ts` |
| Integration (component) | `.integration.test.tsx` | `upload-page-client.integration.test.tsx` |
| Smoke | `.test.tsx` | `infrastructure.test.tsx` |

The `.integration.` infix for components is the **only** exception in this project — it signals React Testing Library + provider setup is required.

**Keep consistent**: a route test named `health-and-env-contract.test.ts` vs `vocabulary-save-route.test.ts` — prefer the `-route.test.ts` suffix for all API routes.

---

## What to Write vs What to Skip

### Write a unit test when:
- Function has **non-trivial logic**: branching, edge cases, normalization, stat calculation
- Behavior is not obvious from reading the code (e.g., Prisma error compaction, p95 calculation)
- Security-adjacent behavior (PII scrubbing, auth header stripping)
- Logic lives in a shared utility called from many places — one test catches regressions everywhere

### Write an integration test when:
- Multiple modules interact (route → auth → query → response shape)
- Contract matters (API response schema, error status codes)
- Framework wiring must be verified (Next.js route handlers, Prisma mock behavior)

### Skip the test when:
- It's a **getter/setter** or pass-through with zero logic
- You're testing **framework internals** (does Next.js routing work? — yes, they test that)
- The test would be 90% mock setup and 10% assertion on mock return value (you're testing your mocks, not your code)
- **100% coverage target** drives you to test simple config objects
- The function is so trivial that reading it is faster than reading the test

### Concrete examples from this codebase:

| File | Write test? | Why |
|------|------------|-----|
| `normalizeText` | ✅ Yes | Non-trivial: Unicode, whitespace collapse, case rules |
| Sentry `beforeSend` | ✅ Yes | PII scrubbing logic, security-critical |
| `calculateRoundTripStats` | ✅ Yes | p95 math, non-obvious |
| `reportLatencyBudgetFailures` | ✅ Yes | soft=warn, hard=throw — subtle branching |
| A DB query that's just `db.find({ where: id })` | ❌ Skip | No logic; test the route that calls it instead |
| A Zod schema definition | ❌ Skip | Framework behavior; test validation in the route handler |
| A React component that just renders props | ❌ Skip | No logic; only test if it has conditional rendering or user interaction |

---

## Summary Rule

> Test the **logic**, not the **wiring**.
> If a test fails only because you renamed a variable or reorganized imports, it's testing wiring.
> If a test fails because you broke behavior a user would notice, it's testing logic.

---

## Sources

- [Vitest: Writing Tests](https://main.vitest.dev/guide/learn/writing-tests)
- [Next.js Testing with Vitest](https://nextjs.org/docs/app/guides/testing/vitest)
- [Test file organization strategies – StudyRaid](https://app.studyraid.com/en/read/11292/352301/test-file-organization-strategies)
- [Why Most Unit Tests Are Useless – Medium](https://medium.com/javarevisited/why-most-unit-tests-are-useless-and-what-to-do-instead-05aa42245b05)
- [Unit Testing is Overrated – Oleksii Holub](https://tyrrrz.me/blog/unit-testing-is-overrated)
- [Clean test suites structure – Medium](https://thiagooliveirasantos.medium.com/typescript-unit-tests-best-practices-part-4-clean-test-suites-structure-94f5fd5fdf8)
