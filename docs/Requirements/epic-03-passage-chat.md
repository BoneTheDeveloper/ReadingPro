# EP-03 · Passage Chat

**PRD Solution area:** 3. Go deeper through chat

The usser uses a passage-grounded chat to dig into the content — not only to study, but to
research and pull more information about what the passage covers.


## US-08 · Ask a question grounded in the passage

User  ask a tutor question about the selected passage to
get contextual explanations while reading.

**Acceptance criteria**

```gherkin
Scenario: Ask about an owned passage
  Given I own the selected passage
  When I ask a question in the chat
  Then the system answers using the passage context and streams the response
  And it persists the conversation for later

Scenario: Passage not owned
  Given I do not own the selected passage
  When I try to ask
  Then the system rejects the request
```

---

## US-09 · Research deeper through chat


User ask follow-up and research questions that go beyond literal
comprehension

**Acceptance criteria**

```gherkin
Scenario: Continue a research thread
  Given I have an ongoing chat about a passage I own
  When I ask a broader question about the topic
  Then the system answers in context and keeps the thread coherent across turns
```

- Chat is scoped to the passage I own; answers stay grounded in that context.
