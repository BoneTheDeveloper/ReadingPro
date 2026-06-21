# EP-02 · Study & Comprehension

**PRD Solution area:** 2. Check understanding

The learner reads a passage in a focused workspace and checks how well they understood it
through a simplified view, comprehension questions, and a flashcard self-test.

---

## US-06 · Toggle a simplified view

**Priority:** Should **Status:** Implemented

**As a** learner, **I want** to toggle a simplified version of a passage, **so that** I can
read it at an easier level when the original is too hard.

**Acceptance criteria**

```gherkin
Scenario: Simplified content available
  Given a passage has a simplified version
  When I toggle the simplified view
  Then the system shows the simplified text alongside the original level

Scenario: No simplified content
  Given a passage has no simplified version
  When I open it
  Then the simplified toggle is disabled
```

**Traceability:** Use case [UC-02](../use-cases.md#uc-02-read-passage-with-simplified-view) ·
Scope: Study · Tests: [test-scenarios.md](../../Testing/test-scenarios.md)

---

## US-07 · Answer comprehension questions

**Priority:** Must **Status:** Implemented

**As a** learner, **I want** to answer comprehension questions with feedback and source
citations, **so that** I can check my understanding of a passage.

**Acceptance criteria**

```gherkin
Scenario: Answer a question
  Given a passage has generated questions
  When I select an option and submit
  Then the system shows correct/incorrect feedback with an explanation
  And it highlights the cited source text in the passage

Scenario: No option selected
  Given I have not selected an option
  When I look at the submit control
  Then it is disabled until I choose an answer
```

**Traceability:** Use case [UC-03](../use-cases.md#uc-03-take-flashcard-test) ·
Scope: Study · Tests: [test-scenarios.md](../../Testing/test-scenarios.md)

---

## US-08 · Take a flashcard test

**Priority:** Should **Status:** Implemented

**As a** learner, **I want** to run through a passage's questions as a flashcard test, **so
that** I get a quick score of how well I understood it.

**Acceptance criteria**

```gherkin
Scenario: Complete a test
  Given a passage has generated questions
  When I answer each question in turn
  Then the system tracks my answers and shows a final score summary

Scenario: All questions answered
  Given I have answered the last question
  When I continue
  Then the system shows the results summary directly
```

**Traceability:** Use case [UC-03](../use-cases.md#uc-03-take-flashcard-test) ·
Scope: Study · Tests: [test-scenarios.md](../../Testing/test-scenarios.md)

---

## US-09 · Manage the study workspace

**Priority:** Could **Status:** Implemented

**As a** learner, **I want** a resizable multi-panel study workspace, **so that** I can read,
quiz, translate, and chat in one place.

**Acceptance criteria**

```gherkin
Scenario: Resize panels
  Given I am in the study workspace
  When I drag a panel divider
  Then the panel resizes and the layout persists across sessions
```

- The workspace hosts reading content, the question/quiz studio, and the translate panel.

**Traceability:** Use case [UC-08](../use-cases.md#uc-08-manage-study-workspace) ·
Scope: Study · Tests: [test-scenarios.md](../../Testing/test-scenarios.md)
