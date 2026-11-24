# EP-02 · Study & Comprehension

**PRD Solution area:** 2. Check understanding

The learner reads a passage in a focused workspace and checks how well they understood it
through a simplified view, comprehension questions, and a flashcard self-test.

Questions and flashcards are two independent generate actions over the same passage. Each
produces its own studio artifact with its own content and its own result — neither is a
display mode of the other.

Both generate actions open an options popup first. The option schemas and their prompt
mapping live in `src/shared/studio/generation-options.ts` and
`src/server/modules/artifact/artifact-prompts.ts`; the defaults reproduce the original
fixed set (5 medium multiple-choice questions, 5 vocabulary cards).


## US-06 · Answer comprehension questions

Answer comprehension questions with feedback and source
citations, so the user can check my understanding of a passage.

**Acceptance criteria**

```gherkin
Scenario: Configure the question set
  Given I am reading a passage
  When I run the question generate action
  Then I can choose the count (3/5/10/15), difficulty, formats (multiple choice,
    True/False/Not Given, fill in the blank), focus skills and explanation language
  And the generated set follows those choices

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


## US-07 · Self-test with generated flashcards

Generate flashcards from a passage and run through them, so that the user can  get a quick check of which terms and ideas from that passage I retained.

**Acceptance criteria**

```gherkin
Scenario: Generate flashcards
  Given I am reading a passage
  When I run the flashcard generate action
  And I choose the count (5/10/15/20), content type, difficulty, back side and examples
  Then the system creates a flashcard artifact for that passage
  And each card carries a front, a back, and optionally an example sentence from the passage

Scenario: Complete a run
  Given a passage has generated flashcards
  When I mark each card as known or not known
  Then the system shows a final score and stores it on the artifact

Scenario: Run again
  Given I already completed a run
  When I run through the cards again
  Then the new score replaces the previous one
```
