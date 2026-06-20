# EP-05 · Memorization & Review

**PRD Solution area:** 5. Memorize them · [Product PRD](../../Product/overview-prd.md)

From the word bank the learner builds word sets — manually or automatically — and memorizes
them through spaced repetition, with each word carrying its passage context into review.

---

## US-16 · Organize words into sets manually

**Priority:** Must **Status:** Implemented

**As a** learner, **I want** to organize saved vocabulary into sets, **so that** I can group
terms for focused review.

**Acceptance criteria**

```gherkin
Scenario: Create a manual set
  Given I have saved words in my word bank
  When I group selected words into a named set
  Then the set is saved and available for review
```

**Traceability:** Use case [UC-10](../use-cases.md#uc-10-save-vocabulary) ·
Scope: Vocabulary · Tests: [test-scenarios.md](../../Testing/test-scenarios.md)

---

## US-17 · Generate word sets automatically

**Priority:** Should **Status:** Implemented

**As a** learner, **I want** the app to build daily and weekly word sets automatically, **so
that** I always have a fresh set to review without organizing it myself.

**Acceptance criteria**

```gherkin
Scenario: Auto daily/weekly set
  Given I have words in my word bank
  When an automated set is generated
  Then it contains due and new words and is offered for review
```

- Auto sets respect each word's status (NEW / LEARNING / MASTERED).

**Traceability:** Use case [UC-10](../use-cases.md#uc-10-save-vocabulary) ·
Scope: Vocabulary · Tests: [test-scenarios.md](../../Testing/test-scenarios.md)

---

## US-18 · Review due cards with spaced repetition

**Priority:** Must **Status:** Implemented

**As a** learner, **I want** to review due cards, **so that** spaced repetition schedules my
next review at the right time.

**Acceptance criteria**

```gherkin
Scenario: Review due cards
  Given I have cards due for review
  When I start a review session
  Then the system presents each due card and records my session

Scenario: Nothing due
  Given I have no cards due
  When I open review
  Then the system shows an "all caught up" state and disables starting a session
```

**Traceability:** Use case [UC-04](../use-cases.md#uc-04-review-due-cards-spaced-repetition) ·
Scope: Review · Tests: [test-scenarios.md](../../Testing/test-scenarios.md)

---

## US-19 · Rate recall to schedule the next review

**Priority:** Must **Status:** Implemented

**As a** learner, **I want** to rate how well I recalled each card, **so that** the schedule
adapts to my actual retention.

**Acceptance criteria**

```gherkin
Scenario: Rate a card
  Given I am reviewing a due card
  When I rate my recall quality
  Then the system updates the card's interval and next review date
```

- A poor recall shortens the interval; a strong recall lengthens it.

**Traceability:** Use case [UC-04](../use-cases.md#uc-04-review-due-cards-spaced-repetition) ·
Scope: Review · Tests: [test-scenarios.md](../../Testing/test-scenarios.md)
