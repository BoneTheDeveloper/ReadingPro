# EP-04 · Vocabulary Capture

**PRD Solution area:** 4. Capture words

The learner gets the meaning of any word efficiently — through inline translation and an
in-app dictionary, in the study page and on a dedicated standalone page — and stores chosen
words, with their passage context, into a word bank.

---

## US-10 · Look up a selection in the study page

Look up a word selected in a passage I own, to understand it without leaving the page.

**Acceptance criteria**

```gherkin
Scenario: Look up a word (every plan)
  Given I select an English word in a passage I own and press "Dịch"
  Then the Studio "Tra từ" view opens, expanding the Studio panel if it was collapsed
  And it shows the dictionary entry: headword, phonetic, meanings grouped by part of speech, and examples
  And the lookup is added to the passage's "Từ đã tra" list
  And no AI model is called

Scenario: Inflected word
  Given I look up "running", "went" or "studies"
  Then the base form ("run", "go", "study") is shown, marked "Dạng gốc"
  And when the inflected word has its own entry ("running"), that entry comes first and the base form follows

Scenario: Phrasal verb in the sentence
  Given the words right after the selection form an idiom of the entry ("looks after" → "to look after")
  Then that idiom is shown first, marked "Theo câu"

Scenario: Word not in the dictionary
  Given the dictionary has no entry for the word or its base forms
  Then the view says so and offers the outside translators
  And nothing is added to "Từ đã tra"

Scenario: Lookup history
  Given I looked a word up in a passage
  Then its row stays in "Từ đã tra" after a reload, reopens the entry, and can be deleted
  And looking it up again keeps one row and moves it to the top
  And deleting the passage deletes its rows

Scenario: AI meaning in context, on request (Pro)
  Given I am on the Pro plan and press "Dịch"
  Then the same Studio view opens, and no AI model is called yet
  When I press "Dịch theo ngữ cảnh"
  Then the view shows the AI meaning of the word in its sentence, which I can pick and save

Scenario: AI meaning for a Free user
  Given I am on the Free plan
  Then "Dịch theo ngữ cảnh" is locked with a note that it is part of Pro
  And a Free user who calls the AI translation endpoint directly is refused (plan.pro_required)
```

- Meanings come from the OVDP / Hồ Ngọc Đức English-Vietnamese dictionary, imported into
  the database (see the README, "Dictionary data"). Only single-word headwords are imported;
  phrasal verbs live inside the verb's entry as idioms.
- The view also opens outside translators (Google Dịch for the word or the sentence,
  Cambridge, Oxford Learner's, DeepL) in one reused popup window.
- The AI meaning is cached on the client for the current session and is not stored.
  "Từ đã tra" stores the word, the selected text and its sentence, not the meanings.

## US-11 · Save a word with its passage context


Save a selected word together with the sentence it appeared in,
review it later with the passage where I first met it.

From the "Tra từ" view, I pick a dictionary meaning (or the AI meaning, on Pro) or type my
own, choose its part of speech, and save it. The saved word is the headword of the entry the
meaning came from, so picking a meaning of "run" while reading "running" saves "run".

**Acceptance criteria**

```gherkin
Scenario: Save a new word
  Given I have selected a word in a passage I own
  When I save it
  Then the word, its translation, the sentence it appeared in, and its passage are stored in my word bank
  And the word is marked NEW
  And the word is placed in my default set

Scenario: Save a duplicate
  Given the same word with the same translation is already saved
  When I save it again
  Then the existing entry is updated in place, not duplicated
  And its first context sentence is kept
  And it stays in the set it is already in
```

- Each word keeps one context: the sentence where it was first saved. It is shown on the
  back of the review card, not used as a translation cache.
- "The same word with the same translation" means the same lemma and the same translation
  after normalization: trimmed, whitespace collapsed, lowercased. "Run" / "run" and
  "Chạy" / "chạy" are the same entry; "chạy" / "chạy bộ" are different entries.
