# User Flows

## Upload And Study

```text
Sign in
  -> upload text or PDF
  -> processing/analyze content
  -> open reading or study workspace
  -> switch original/simplified content
  -> answer generated questions
  -> review progress
```

## Inline Translation

```text
Open a passage in study workspace
  -> select text
  -> request translation
  -> receive dictionary/provider-backed result
  -> optionally save vocabulary item
```

## Dictionary Lookup

```text
Open dictionary page or translation popup
  -> type or select English term
  -> get suggestions/search results
  -> open entry detail with senses and Vietnamese translations
```

## Study Chat

```text
Open a passage in study workspace
  -> open chat panel
  -> ask a passage-grounded question
  -> stream tutor response
  -> persist user and assistant messages
  -> reload passage chat history later
```

## Spaced Repetition

```text
Open test/review
  -> answer generated question card
  -> submit quality rating
  -> SM-2 calculates next interval
  -> progress dashboard counts due/mature/today/streak metrics
```

## Auth

```text
Visit protected route
  -> Clerk session check
  -> redirect to localized sign-in when unauthenticated
  -> sync Clerk user into UserProfile on authenticated server access
```
