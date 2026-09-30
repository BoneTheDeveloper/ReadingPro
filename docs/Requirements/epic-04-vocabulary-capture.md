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
  Then the system returns a translation and caches it for the current session

Scenario: Selection invalid or not owned
  Given my selection exceeds limits or the passage is not mine
  When I request a translation
  Then the system rejects it with an error

Scenario: Cached translation
  Given the same word in the same sentence was translated earlier in this session
  When I request it again
  Then the system returns the cached translation without re-calling the model
```

- The cache lives on the client for the current session only. Translations are not
  stored in the database, and there is no translation history.


## US-11 · Save a word with its passage context


Save a selected word together with the sentence it appeared in,
review it later with the passage where I first met it.

**Acceptance criteria**

```gherkin
Scenario: Save a new word
  Given I have selected a word in a passage I own
  When I save it
  Then the word, its translation, the sentence it appeared in, and its passage are stored in my word bank
  And the word is marked NEW

Scenario: Save a duplicate
  Given the same word with the same translation is already saved
  When I save it again
  Then the existing entry is updated in place, not duplicated
  And its first context sentence is kept
```

- Each word keeps one context: the sentence where it was first saved. It is shown on the
  back of the review card, not used as a translation cache.
- "The same word with the same translation" means the same lemma and the same translation
  after normalization: trimmed, whitespace collapsed, lowercased. "Run" / "run" and
  "Chạy" / "chạy" are the same entry; "chạy" / "chạy bộ" are different entries.
