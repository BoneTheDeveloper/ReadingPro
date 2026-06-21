# EP-06 · Account & Access

**PRD Solution area:** cross-cutting (privacy & ownership)

The learner signs in to access their own passages, vocabulary, and progress, and signs out to
end the session. All content is private and owned per authenticated learner.

---

## US-20 · Sign in or sign up

**Priority:** Must **Status:** Implemented

**As a** visitor, **I want** to sign in or sign up via email or Google, **so that** I can
access my own passages and progress.

**Acceptance criteria**

```gherkin
Scenario: Email sign in
  Given I am on the sign-in page
  When I submit valid credentials
  Then the system authenticates me and redirects me to my original destination

Scenario: Google sign in
  Given I choose "Continue with Google"
  When I complete the consent flow
  Then the system establishes my session and opens the study page

Scenario: Invalid credentials
  Given I submit wrong credentials
  When I sign in
  Then the system shows an error and lets me retry or sign up
```

**Traceability:** Use case [UC-05](../use-cases.md#uc-05-sign-in--sign-up) ·
Scope: Auth · Tests: [test-scenarios.md](../../Testing/test-scenarios.md)

---

## US-21 · Sign out

**Priority:** Must **Status:** Implemented

**As a** learner, **I want** to sign out, **so that** I can end my session securely.

**Acceptance criteria**

```gherkin
Scenario: Sign out
  Given I am signed in
  When I sign out
  Then the system clears my session and returns me to the sign-in page
```

**Traceability:** Use case [UC-06](../use-cases.md#uc-06-sign-out) ·
Scope: Auth · Tests: [test-scenarios.md](../../Testing/test-scenarios.md)
