# EP-05 · Memorization & Review

**PRD Solution area:** 5. Memorize them

From the word bank the learner builds word sets — manually, or automatically with a Pro
subscription — and memorizes them through one-way (English → Vietnamese) spaced repetition,
with each word carrying its passage context into review.

Sets work like Anki decks. Every word is in exactly one set. A word saved while reading lands
in the learner's default set, which always exists and cannot be deleted; moving a word into
another set takes it out of the one it was in. The review schedule lives on the word and
moves with it.

Desired retention is a per-user setting. The number of new words introduced per day is a
per-set setting.

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
  And each selected word leaves the set it was in

Scenario: Take a word out of a set
  Given a word is in a set other than the default set
  When I remove it from that set
  Then the word returns to the default set and keeps its schedule

Scenario: Delete a set
  Given a set other than the default set
  When I delete it
  Then its words return to the default set and keep their schedules

Scenario: Default set
  Given my default set
  When I open it
  Then I can rename it but not delete it
```

- The set list shows every set, the default set first. Each set shows its word count, the
  count of words per review status, the date it was last studied, and whether it was studied
  today. A set counts as studied when any of its words was rated, in a review of that set or
  of all sets.
- Each set has its own daily new-word limit, editable on the set.

## US-13 · Generate a word set automatically (Pro)

As a Pro subscriber, I can create a set in one step instead of picking words by hand.

**Acceptance criteria**

```gherkin
Scenario: Generate a set
  Given I am a Pro subscriber with words in my word bank
  When I ask for a generated set of N words
  Then the system creates a normal set and moves into it, from my default set,
    due words first, then NEW words, up to N

Scenario: Not Pro
  Given I am on the free tier
  When I try to generate a set
  Then the option is not available to me
```

- A generated set is an ordinary set: it has no special type or status and can be renamed,
  edited, and deleted like a manual set.
- Words the learner already filed in another set are not pulled into a generated set.

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

Scenario: Review one set
  Given a set with cards due
  When I start a review from that set
  Then the session presents only that set's cards

Scenario: Review all sets
  Given cards due in several sets
  When I start a review without choosing a set
  Then the session presents the cards of every set
```

- A session presents due cards first, then NEW cards. Each set contributes NEW cards up to
  what is left of its own daily limit, so a review of all sets adds up the sets' allowances.
- A review of all sets creates no set; it is recorded as a session that belongs to no set.


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
