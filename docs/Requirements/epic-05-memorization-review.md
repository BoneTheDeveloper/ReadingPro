# EP-05 · Memorization & Review

**PRD Solution area:** 5. Memorize them

From the word bank the learner builds word sets — manually, or automatically with a Pro
subscription — and memorizes them through one-way (English → Vietnamese) spaced repetition,
with each word carrying its passage context into review.

A set is only a container of words. The review schedule lives on each word and is shared by
every set that contains it; scheduling settings (desired retention, new words per day) are
per user, not per set.

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

## US-13 · Generate a word set automatically (Pro)

As a Pro subscriber, I can create a set in one step instead of picking words by hand.

**Acceptance criteria**

```gherkin
Scenario: Generate a set
  Given I am a Pro subscriber with words in my word bank
  When I ask for a generated set of N words
  Then the system creates a normal set with due words first, then NEW words, up to N

Scenario: Not Pro
  Given I am on the free tier
  When I try to generate a set
  Then the option is not available to me
```

- A generated set is an ordinary set: it has no special type or status and can be renamed,
  edited, and deleted like a manual set.

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

- Ratings are Again / Hard / Good / Easy. A poor recall shortens the interval; a strong
  recall lengthens it.
- Each word has one review status, set only by the scheduler: NEW (never reviewed),
  LEARNING (first short learning steps), REVIEW (scheduled in days), RELEARNING (forgotten
  during review, back to short steps). The learner cannot edit it by hand.
