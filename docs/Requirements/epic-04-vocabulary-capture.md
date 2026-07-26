# EP-04 · Vocabulary Capture

**PRD Solution area:** 4. Capture words

The learner gets the meaning of any word efficiently — through inline translation and an
in-app dictionary, in the study page and on a dedicated standalone page — and stores chosen
words, with their passage context, into a word bank.

---

## US-12 · Translate a selection in the study page

**Priority:** Must **Status:** Implemented

**As a** learner, **I want** to translate a selected phrase from a passage I own, **so that** I
understand difficult text in my language.

**Acceptance criteria**

```gherkin
Scenario: Translate an owned selection
  Given I select English text in a passage I own
  When I request a translation
  Then the system returns a translation and records it in cache and history

Scenario: Selection invalid or not owned
  Given my selection exceeds limits or the passage is not mine
  When I request a translation
  Then the system rejects it with an error

Scenario: Cached translation
  Given the same selection was translated before
  When I request it again
  Then the system returns the cached translation without re-calling the model
```

**Traceability:** Use case [UC-09](../use-cases.md#uc-09-translate-selection) ·
Scope: Translation · Tests: [test-scenarios.md](../../Testing/test-scenarios.md)

---

## US-13 · Translate and look up on a standalone page

**Priority:** Should **Status:** Planned

**As a** learner, **I want** a dedicated translate-and-dictionary page outside the study
workspace, **so that** I can look up and save words even when I am not reading a passage.

**Acceptance criteria**

```gherkin
Scenario: Look up a word standalone
  Given I am on the standalone translate/dictionary page
  When I enter a word or phrase
  Then the system returns its translation and dictionary entry
  And I can save it to my word bank from there
```

**Traceability:** Use case _(to author)_ · Scope: Translation / Dictionary · Tests: _pending_

---

## US-14 · Search the dictionary

**Priority:** Must **Status:** Implemented

**As a** learner, **I want** to search the English-Vietnamese dictionary, **so that** I can
look up headwords, aliases, or suggestions.

**Acceptance criteria**

```gherkin
Scenario: Matching entries found
  Given the seeded dictionary contains the query
  When I search by headword or alias
  Then the system returns matching entries grouped by headword

Scenario: No match
  Given the query has no exact match
  When I search
  Then the system returns an empty result with suggestions
```

**Traceability:** Use case [UC-11](../use-cases.md#uc-11-search-dictionary) ·
Scope: Dictionary · Tests: [test-scenarios.md](../../Testing/test-scenarios.md)

---

## US-15 · Save a word with its passage context

**Priority:** Must **Status:** Implemented

**As a** learner, **I want** to save a selected word together with the context it appeared in,
**so that** I review it later with the passage where I first met it.

**Acceptance criteria**

```gherkin
Scenario: Save a new word
  Given I have selected a word in a passage I own
  When I save it
  Then the word, its translation, and its source context are stored in my word bank
  And the word is marked NEW

Scenario: Save a duplicate
  Given the same word from the same context is already saved
  When I save it again
  Then the existing entry is updated in place, not duplicated
```

**Traceability:** Use case [UC-10](../use-cases.md#uc-10-save-vocabulary) ·
Scope: Vocabulary · Tests: [test-scenarios.md](../../Testing/test-scenarios.md)
