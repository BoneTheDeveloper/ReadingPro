# Business Requirements Document (BRD)

**English Reading Training App**

This document owns the **business case**: objective, value propositions, business model,
and milestones. Product vision (users, problem, solution, goal, success metrics) lives in
the [Overview PDR](../Product/overview-pdr.md); the authoritative scope list lives in
[feature-scope.md](../Product/feature-scope.md). This BRD links to those rather than
restating them.

---

## 1. Business Objective

Build an AI-powered English reading trainer that connects reading with vocabulary learning,
so non-native speakers retain words learned in context better than with context-free drilling.

---

## 2. Target Users

See [Overview PDR → Users](../Product/overview-pdr.md#users) (single segment: the independent learner).

---

## 3. Problem & Solution

See [Overview PDR → Problem](../Product/overview-pdr.md#problem) and
[→ Solution](../Product/overview-pdr.md#solution).

> **Note:** A1-level content skips the simplification step entirely — `simplifiedContent` remains null.
>
> **Session lifecycle:** Study sessions track activity (reading, quizzes, reviews) and auto-close when the user logs out or is inactive for an extended period.

---

## 4. Core Value Propositions

| Value | Description |
|-------|-------------|
| Adaptive Difficulty | AI detects text complexity and simplifies to learner's level |
| Source-Backed Testing | Every answer traceable to passage text with line citations |
| Long-term Retention | Fixed-interval vocabulary review scheduling drives efficient review |
| Minimal Friction | Upload text/PDF, get instant analysis and flashcards |

---

## 5. Success Metrics

The product success metrics (M1 retention, M2 engagement, M3 flow completion) are owned by
[Overview PDR → Success Metrics](../Product/overview-pdr.md#success-metrics). Business targets
track against those; they are not re-listed here to avoid drift.

---

## 6. Business Model

| Tier | Features |
|------|----------|
| FREE | Upload (limited), analyze, flashcards, progress tracking, below-question explanations |
| PRO | Higher upload limits, paragraph-attached explanations (explanations linked directly to passage paragraphs, not just shown below questions), advanced analytics, export (future) |

_Payment/billing integration deferred — not permanently excluded. All features currently free during MVP._

---

## 7. Scope

Scope (in and out) is owned by [feature-scope.md](../Product/feature-scope.md). Payment/billing
is deferred rather than permanently excluded — see the §6 note.

---

## 8. Milestones

| Phase | Scope | Status |
|-------|-------|--------|
| MVP | Upload, CEFR detect, simplify, questions, flashcards, progress | Done |
| Auth | Clerk (email/password + Google OAuth) | Done |
| Sentry | Error tracking, performance monitoring, source maps | Done |
| Content Expansion | YouTube transcription, OCR for scanned PDFs | Planned |
| Advanced Features | Resizable workspace, analytics dashboard | In Progress |
| Production | Neon PostgreSQL, Vercel Blob, Vercel deploy, multi-user | In Progress |

---

**Last Updated:** 2026-06-05
