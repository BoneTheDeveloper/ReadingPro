# BRD & Schema Gap Analysis — Brainstorm Report

**Date:** 2026-05-10
**Scope:** Cross-reference BRD, SRS, ERD, Data Dictionary, Use Cases, and Prisma schema

---

## Problem Statement

BRD and database docs written independently from Prisma schema. Result: misalignments, missing requirements, and vague business rules that don't translate to schema constraints.

---

## Decisions (15 Questions Resolved)

### BRD-Schema Alignment

| # | Issue | Decision | Action |
|---|-------|----------|--------|
| Q1 | A1 simplification edge case | **Skip simplification** for A1 passages | Store `simplifiedContent = null`, `simplifiedLevel = null`. Add note to BRD §4. |
| Q2 | SourceType enum extensibility | **Leave as-is** (TEXT, PDF) | Migrate when YouTube feature is planned. No premature enum values. |
| Q3 | Question quality rating metric | **Drop from BRD** | No rating field in schema. YAGNI — no UI for rating questions. Remove from §6 Success Metrics. |
| Q4 | Upload quota tracking | **Defer** | No schema change. Add quota fields when PRO tier is implemented. |

### Business Model

| # | Issue | Decision | Action |
|---|-------|----------|--------|
| Q5 | FREE tier limits | **None for now** | No limits at MVP. Add when billing is implemented. Update BRD §7. |
| Q6 | stripeCustomerId in schema | **Remove** | YAGNI — payment is out of scope. Add back when billing is built. Remove from UserProfile. |
| Q7 | "Advanced analytics" for PRO | **Source-backed analytics** | Analytics trace explanations back to original passage paragraphs. Not just answer text. Define concretely when PRO is planned. |

### Target Users

| # | Issue | Decision | Action |
|---|-------|----------|--------|
| Q8 | Language Teachers segment | **Remove from BRD** | Self-taught users only. Future: add sharing function (not teacher management). Update BRD §2. |

### Operational Requirements

| # | Issue | Decision | Action |
|---|-------|----------|--------|
| Q9 | Partial AI pipeline failure | **Store partial + status** | Add `status` enum to Passage: `PROCESSING`, `COMPLETE`, `FAILED`. Allow retry of failed steps. |
| Q10 | AI cost tracking | **Add ApiUsage table** | Track per-user AI API calls: endpoint, tokens, cost estimate, timestamp. Prevent cost overruns. |
| Q11 | Data deletion policy | **30-day grace period** | Add `deletedAt DateTime?` to UserProfile. Scheduled purge hard-deletes after 30 days. GDPR-friendly + recovery window. |

### Session Model (Major Redesign)

| # | Issue | Decision | Action |
|---|-------|----------|--------|
| Q12 | StudySession disconnected from workflow | **New model** (user-provided) | Replace current StudySession with modular activity-tracking model (see below). |
| Q13 | "Multi-tenant" milestone | **Rename to "multi-user"** | No org/tenant concept needed. Change BRD §9 wording. |
| Q14 | Session duration tracking | **Derive from timestamps** | `endedAt - startedAt`. No extra field needed. |
| Q15 | CEFR accuracy metric | **Drop from BRD** | Impractical at MVP scale. Manual validation sufficient. Remove from §6. |

---

## Recommended Schema Changes

### 1. Remove from UserProfile
```
- stripeCustomerId  (Q6)
```

### 2. Add to UserProfile
```
+ deletedAt DateTime? nullable  (Q11)
```

### 3. Add Passage status enum
```prisma
enum PassageStatus {
  PROCESSING
  COMPLETE
  FAILED
}

// Add to Passage model:
+ status PassageStatus @default(PROCESSING)
```

### 4. Replace StudySession with new models (Q12)

```prisma
model StudySession {
  id        String   @id @default(cuid())
  userId    String
  startedAt DateTime @default(now())
  endedAt   DateTime?

  activities  SessionActivity[]
  cardReviews CardReview[]

  user UserProfile @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, startedAt])
  @@map("study_sessions")
}

model SessionActivity {
  id        String       @id @default(cuid())
  sessionId String
  type      ActivityType
  passageId String?
  timestamp DateTime     @default(now())

  session StudySession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  passage Passage?     @relation(fields: [passageId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@map("session_activities")
}

enum ActivityType {
  PASSAGE_READ
  QUIZ_TAKEN
  CARDS_REVIEWED
  PASSAGE_UPLOADED
}
```

### 5. Add ApiUsage table (Q10)

```prisma
model ApiUsage {
  id          String   @id @default(cuid())
  userId      String
  endpoint    String   // e.g. "cefr-detect", "simplify", "question-generate"
  tokensUsed  Int
  costEstimate Float   // USD
  createdAt   DateTime @default(now())

  user UserProfile @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@map("api_usage")
}
```

### 6. Add relation to CardReview
```prisma
// Add to CardReview:
+ sessionId String?  // link to study session
+ session   StudySession? @relation(fields: [sessionId], references: [id])
```

---

## BRD Updates Required

| Section | Change |
|---------|--------|
| §2 Target Users | Remove "Language Teachers". Add note: self-taught users, future sharing. |
| §4 Solution | Add edge case: A1 content skips simplification. Clarify non-linear studio workflow. |
| §6 Success Metrics | Remove "Question quality score >4/5". Remove "CEFR detection accuracy >80%". Keep rest. |
| §7 Business Model | Remove PRO tier details (YAGNI until billing planned). Simplify to: all features free for now. |
| §8 Out of Scope | Move "Payment/billing" note: deferred, not permanently excluded. |
| §9 Milestones | Rename "multi-tenant" → "multi-user". Update statuses. |

---

## SRS Updates Required

| Section | Change |
|---------|--------|
| FR-02 CEFR Detection | Add note: A1 detection result → skip simplification step |
| FR-07 Study Sessions | Rewrite to match new StudySession + SessionActivity model |
| FR-10 Study Workspace | Clarify non-linear usage — user picks tools freely from studio panel |
| API Endpoints | Update session endpoints to match new model |

---

## Use Case Updates Required

| Use Case | Change |
|----------|--------|
| UC-04 Review Due Cards | Update to create StudySession + SessionActivity(CARDS_REVIEWED) |
| New UC | Add "Free Study Session" — user opens workspace, does any mix of activities |
| UC-03 Take Flashcard Test | Add SessionActivity(QUIZ_TAKEN) tracking |

---

## ERD Updates Required

- Remove stripeCustomerId from UserProfile
- Add deletedAt to UserProfile
- Add status to Passage
- Replace StudySession with new model (session + activities)
- Add ApiUsage table
- Add sessionId to CardReview

---

## Data Dictionary Updates Required

- Update all affected tables per schema changes above
- Add new tables: SessionActivity, ApiUsage
- Add new enums: PassageStatus, ActivityType
- Remove Tier enum (if PRO tier removed from BRD) — **wait**: keep Tier for future, just remove from current scope docs

---

## Risks

| Risk | Mitigation |
|------|------------|
| Migration complexity (StudySession redesign) | Existing sessions have no data (feature unused), safe to replace |
| ApiUsage table growth | Add monthly partitioning or TTL in production |
| 30-day purge needs cron job | Simple Vercel cron or Supabase pg_cron |

---

## Unresolved Questions

1. **PRO tier timeline** — when should we define concrete FREE limits? (Suggested: when user base >100)
2. **ApiUsage cost thresholds** — what per-user daily/monthly limit before blocking? (Suggested: $1/day free, configurable)
3. **Session auto-close** — when to set endedAt? Explicit user action or inactivity timeout?
