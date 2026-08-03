# EP-05 · Memorization & Review

**PRD Solution area:** 5. Memorize them

From the word bank the learner builds word sets — manually or automatically — and memorizes
them through spaced repetition, with each word carrying its passage context into review.

A card here is a word-bank entry reviewed on a schedule across passages. It is not the
passage flashcard artifact of US-05, which belongs to a single passage and keeps only its
latest run score.



## US-12 · Organize words into sets manually

Organize saved vocabulary into sets, 
**Acceptance criteria**

```gherkin
Scenario: Create a manual set
  Given I have saved words in my word bank
  When I group selected words into a named set
  Then the set is saved and available for review
```

## US-13 · Generate word sets automatically

The app can genareted word sets, the user can have a fresh set to review without organizing it myself.

**Acceptance criteria**

```gherkin
Scenario: Auto daily/weekly set
  Given I have words in my word bank
  When an automated set is generated
  Then it contains due and new words and is offered for review
```

- Auto sets respect each word's status (NEW / LEARNING / MASTERED).

---

## US-14 · Review due cards with spaced repetition

Review due cards through spaced repetition schedules 

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


---

## US-15 · Rate recall to schedule the next review


Rate how well I recalled each card, the schedule
adapts to my actual retention.

**Acceptance criteria**

```gherkin
Scenario: Rate a card
  Given I am reviewing a due card
  When I rate my recall quality
  Then the system updates the card's interval and next review date
```

- A poor recall shortens the interval; a strong recall lengthens it.
