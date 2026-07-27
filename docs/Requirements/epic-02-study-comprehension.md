# EP-02 · Study & Comprehension

**PRD Solution area:** 2. Check understanding

The learner reads a passage in a focused workspace and checks how well they understood it
through a simplified view, comprehension questions, and a flashcard self-test.


## US-06 · Answer comprehension questions


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


## US-07 · Take a flashcard test


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
