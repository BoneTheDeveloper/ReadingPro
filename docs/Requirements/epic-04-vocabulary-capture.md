# EP-04 · Vocabulary Capture

**PRD Solution area:** 4. Capture words

The learner gets the meaning of any word efficiently — through inline translation and an
in-app dictionary, in the study page and on a dedicated standalone page — and stores chosen
words, with their passage context, into a word bank.

---

## US-10 · Translate a selection in the study page

Translate a selected phrase from a passage user own,
understand difficult text in language.

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


## US-11 · Save a word with its passage context


Save a selected word together with the context it appeared in,
review it later with the passage where I first met it.

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
