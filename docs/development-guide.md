# Development Guide

How to take a task from idea to merged code **using these docs**. This is the
reading order and the decision rules — *which doc to open, what to do next, and when each one matters*. 
> **Rule of thumb.** Read top-down: *Why → What → How → Contract → Flow → Verify*.
> Stop descending as soon as you have enough to act. You rarely need every doc.

---

## The Flow at a Glance

```
1. Product        WHY  ──►  Is this in scope? What problem does it solve?
2. Requirements   WHAT ──►  What must it do, in user terms?
3. Architecture   HOW  ──►  Which layer/folder owns this? Where does code go?
4. API            CONTRACT ─►  What is the request/response shape?
5. Flows          PATH ──►  How does data travel UI → persistence?
6. Design         LOOK ──►  (UI tasks) tokens, color, components
7. Testing        VERIFY ►  What proves it works?
```

Each step answers one question and hands you the next. Below: when to enter each
step, what to read, and the exit signal that says "move on."

---

---

## Quick Routing by Task Type

| Task | Minimum path |
|---|---|
| **New feature** | 1 → 2 → 3 → 4 → 5 → (6) → 7 → docs |
| **Bug fix (existing feature)** | 5 (trace the flow) → 3 (find owner) → 7 |
| **New API route** | 4 → 3 → 5 → 7 |
| **UI-only change** | 3 (page doc) → 6 → 7 |
| **Refactor (no behavior change)** | 3 (Core Invariants) → 7 |
| **Pure docs change** | [`README.md`](README.md) ownership rules only |

---

## Step 1 — Product (WHY)

**Enter when:** starting any new feature, or unsure whether the work is in scope.

**Read:**
- [`Product/feature-scope.md`](Product/feature-scope.md) — is this in or out of scope?
- [`Product/product-requirements .md`](Product/product-requirements%20.md) — problem, users, goal.

**Exit when:** you can state, in one sentence, the user problem and that it is in scope.

**Skip when:** the task is a bug fix or refactor on an existing, already-scoped feature.

---

## Step 2 — Requirements (WHAT)

**Enter when:** you know *why*, now you need *what it must do* from the user's side.

**Read:**
- [`Requirements/use-cases.md`](Requirements/use-cases.md) — black-box actor behavior (the contract with the user).
- [`Requirements/user-stories/`](Requirements/user-stories/README.md) — the epic for your feature area.
- [`Requirements/software-requirements.md`](Requirements/software-requirements.md) — when a non-functional rule (perf, validation) applies.

**Exit when:** you have acceptance criteria — the observable behavior that means "done."

---

## Step 3 — Architecture (HOW / WHERE)

**Enter when:** you know *what* to build, now you need *where the code lives*.

**Start here, always:** [`Architecture/README.md`](Architecture/README.md) — the ownership map
(which layer owns runtime, frontend, backend, auth, storage, observability).

**Then go to the owner for your change:**

| Your change is… | Read |
|---|---|
| A backend service / query / module | [`Architecture/backend-architecture.md`](Architecture/backend-architecture.md) |
| A page or feature composition | [`Architecture/frontend-ui-architecture/page-composition-conventions.md`](Architecture/frontend-ui-architecture/page-composition-conventions.md) |
| A reusable UI component | [`Architecture/frontend-ui-architecture/component-catalog.md`](Architecture/frontend-ui-architecture/component-catalog.md) |
| A specific screen | [`Architecture/frontend-ui-architecture/pages/<page>.md`](Architecture/frontend-ui-architecture/README.md) |
| Auth / ownership | [`Architecture/auth-architecture.md`](Architecture/auth-architecture.md) |
| File storage / blobs | [`Architecture/storage-architecture.md`](Architecture/storage-architecture.md) |

**Also read:** [`code-standards.md`](code-standards.md) — the **Core Invariants** are
non-negotiable (server boundary, pure contracts, frontend-via-HTTP-only). Breaking
one is a bug, not a style choice.

**Exit when:** you can name the exact folders/files you will add or edit, in the
correct layer.

---

## Step 4 — API (CONTRACT)

**Enter when:** the change crosses the client↔server boundary (new/changed route,
new payload field, new response shape).

**Read:**
- [`API/api-index.md`](API/api-index.md) — does the route already exist?
- [`API/api-implementation-conventions.md`](API/api-implementation-conventions.md) — how routes validate, respond, and error.
- [`API/Routes/<feature>.md`](API/api-index.md) — the per-feature contract you are touching.

**Rule:** all external input is validated with a Zod schema from `src/contracts/`.
Change the schema *before* the handler.

**Exit when:** request and response shapes are pinned down (including error cases).

**Skip when:** the change is purely frontend or purely internal to one server module.

---

## Step 5 — Flows (PATH)

**Enter when:** the change spans multiple layers and you need to see the full call
path, or you are debugging where a request goes wrong.

**Read:**
- [`Flows/data-flows/<feature>-flow.md`](Flows/README.md) — white-box UI → persistence call path.
- [`Flows/ui-flows/navigation-flow.md`](Flows/ui-flows/navigation-flow.md) — page-to-page UX (navigation changes).
- [`Flows/ui-flows/overall-ui-flows.md`](Flows/ui-flows/overall-ui-flows.md) — in-screen interaction (UX within a screen).

**Exit when:** you can trace your change end-to-end and know every file it touches.

---

## Step 6 — Design (LOOK) — UI tasks only

**Enter when:** the task adds or changes anything visible.

**Read:**
- [`Design/design.md`](Design/design.md) — tokens, color, typography, motion (the single visual source of truth).
- [`Design/design.dark.md`](Design/design.dark.md) — dark-mode color rules.

**Rule:** use existing tokens and catalog components before inventing new ones.

**Exit when:** the visual decisions map to existing tokens/components.

---

## Step 7 — Testing (VERIFY)

**Enter when:** implementation is done (or you are doing TDD — then enter before Step 3).

**Read:**
- [`Testing/test-scenarios.md`](Testing/test-scenarios.md) — what scenarios to cover.
- [`Testing/contract-tests.md`](Testing/contract-tests.md) — when you changed an API contract (Step 4).
- [`Testing/traceability-matrix.md`](Testing/traceability-matrix.md) — link tests back to requirements.
- [`../tests/README.md`](../tests/README.md) — suite structure and naming rules.

**Run the smallest relevant check** (see [`../CLAUDE.md`](../CLAUDE.md)):

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
```

**Exit when:** new behavior is covered, all tests pass, types and lint are clean.

---

## After Implementation — Update the Docs

When the change alters product behavior, architecture, API contracts, DB shape, or
test expectations, **update the canonical owner** (not every doc that links to it):

- New/changed behavior → [`Product/changelog.md`](Product/changelog.md)
- New/changed route → [`API/`](API/api-index.md) owner
- New layer/pattern → [`Architecture/`](Architecture/README.md) owner
- New feature surface → [`codebase-summary.md`](codebase-summary.md) cross-reference table



**Status:** Active
**Last Updated:** 2026-06-21
