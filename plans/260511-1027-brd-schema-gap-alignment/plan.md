# Plan: BRD Updates (Schema Gap Alignment)

## Context

BRD written independently from Prisma schema — misalignments found during brainstorm gap analysis. This plan focuses **only** on updating `docs/database/brd.md` to reflect the 15 brainstorm decisions + user-clarified answers.

## File to Modify

- `docs/database/brd.md`

## Changes (6 sections)

### 1. §2 Target Users — Remove "Language Teachers"

**Before:**
| Segment | Description |
|---------|-------------|
| CEFR Exam Candidates | ... |
| Self-learners | ... |
| Language Teachers | Educators needing comprehension materials for students |

**After:**
| Segment | Description |
|---------|-------------|
| CEFR Exam Candidates | Non-native speakers preparing for A1-C2 exams |
| Self-learners | Individuals improving English reading independently |

Remove "Language Teachers" row. Add note below table: "_Target: self-taught users. Future: sharing function for collaborative learning._"

### 2. §4 Solution — Add A1 edge case + session lifecycle

**Add after step 3** (simplification):
> **Note:** A1-level content skips the simplification step entirely — `simplifiedContent` remains null.

**Add after step 5** (SM-2 retention):
> **Session lifecycle:** Study sessions track all activities (reading, quizzes, reviews). Sessions auto-close when user logs out or is inactive for an extended period.

### 3. §6 Success Metrics — Remove 2 rows

**Remove these rows:**
- "CEFR detection accuracy | >80% agreement with human assessment"
- "Question quality score | >4/5 user rating"

**Keep:**
- User retention (7-day) >40%
- Cards reaching maturity >60%
- Average session duration >5 minutes

### 4. §7 Business Model — Clarify tiers

**Before:**
| Tier | Features |
|------|----------|
| FREE | Upload, analyze, flashcards, progress tracking |
| PRO | Advanced analytics, unlimited uploads, export (future) |

**After:**
| Tier | Features |
|------|----------|
| FREE | Upload (limited), analyze, flashcards, progress tracking, below-question explanations |
| PRO | Higher upload limits, paragraph-attached explanations (explanations linked directly to passage paragraphs, not just shown below questions), advanced analytics, export (future) |

Add note below table: "_Payment/billing integration deferred — not permanently excluded. All features currently free during MVP._"

### 5. §8 Out of Scope — Update payment/billing note

Change "Payment/billing integration" entry to: "Payment/billing integration (deferred — see §7 note)"

### 6. §9 Milestones — Rename multi-tenant

Change "multi-tenant" → "multi-user" in Production row.

## Verification

- [ ] No references to "Language Teachers" remain
- [ ] A1 edge case documented in §4
- [ ] Session lifecycle mentioned in §4
- [ ] §6 has exactly 3 metrics (no quality score, no CEFR accuracy)
- [ ] §7 has both tiers with clear PRO differentiators (uploads, paragraph explanations)
- [ ] §8 notes payment as "deferred"
- [ ] §9 says "multi-user" not "multi-tenant"
- [ ] Last Updated date changed to 2026-05-11
