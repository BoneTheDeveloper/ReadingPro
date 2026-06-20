# EP-07 · Progress & Insights

**PRD Solution area:** Success metrics · [Product PDR](../../Product/overview-pdr.md)

The learner sees how their study and retention are progressing — the surface that makes the
app's [success metrics](../../Product/overview-pdr.md#success-metrics) visible to the learner.

---

## US-22 · View the progress dashboard

**Priority:** Should **Status:** Implemented

**As a** learner, **I want** to see my progress stats, **so that** I know how many cards are
mature, due, and reviewed today.

**Acceptance criteria**

```gherkin
Scenario: View stats with data
  Given I have at least one study session
  When I open the progress dashboard
  Then the system shows total cards, mature cards, due cards, and today's reviews

Scenario: No data yet
  Given I have no study history
  When I open the progress dashboard
  Then the system shows an empty state with an "upload your first passage" call to action
```

- The dashboard is where retention and engagement (success metrics M1–M2) surface to me.

**Traceability:** Use case [UC-07](../use-cases.md#uc-07-view-progress-dashboard) ·
Scope: Review / Progress · Tests: [test-scenarios.md](../../Testing/test-scenarios.md)
