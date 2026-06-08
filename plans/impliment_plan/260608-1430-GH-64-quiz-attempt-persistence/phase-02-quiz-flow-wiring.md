---
phase: 2
title: "Quiz Flow Wiring"
status: pending
priority: P1
effort: "2.5h"
dependencies: [1]
---

# Phase 2: Quiz Flow Wiring

## Overview

Wire the quiz UI to create StudySession + QuizAttempt on first answer submit, and complete QuizAttempt when the quiz finishes. Thread passageId from the parent component. Handle retry by resetting state so next first answer creates a new session + attempt.

## Requirements

- Functional: `passageId` threaded from `study-right-panel.tsx` to `QuizContent`
- Functional: First answer submit creates StudySession (POST /api/study-session) then QuizAttempt (POST /api/quiz-attempt), both awaited before showing feedback
- Functional: QuizResults completes QuizAttempt on mount (PATCH /api/quiz-attempt)
- Functional: "Try Again" resets sessionId and attemptId, so next first answer creates new session + attempt
- Functional: Completion fires once (not on re-renders or strict-mode double-invoke)
- Non-functional: Sequential awaits on first answer (session → attempt). Minimal UX cost since both are fast inserts.

## Architecture

```
study-right-panel.tsx
  └── QuizContent (new props: passageId)
        ├── sessionId: string | null (state)
        ├── attemptId: string | null (state)
        │
        ├── handleCheckAnswer():
        │     if (!sessionId):
        │       await POST /api/study-session { passageId } → sessionId
        │       await POST /api/quiz-attempt { studySessionId, passageId } → attemptId
        │     show feedback
        │
        ├── isComplete → QuizResults (new props: attemptId, correctCount, totalQuestions)
        │     └── useEffect on mount → PATCH /api/quiz-attempt { attemptId, counts }
        │
        └── resetTest(): clear sessionId, attemptId, answers, etc.

Retry flow:
  1. QuizResults completes attempt (PATCH)
  2. User clicks "Try Again" → resetTest() clears all IDs
  3. Next first answer → new session + new attempt
  4. Old attempt stays completed with its counts
```

## Related Code Files

- Modify: `src/features/study/study-right-panel.tsx` — thread passageId to QuizContent
- Modify: `src/features/study/study-quiz-content.tsx` — add passageId prop, sessionId/attemptId state, create session+attempt on first answer
- Modify: `src/features/study/study-quiz-results.tsx` — add attemptId prop, complete attempt on mount
- Read: `src/features/study/study-types.ts` — ResultItem.passageId confirmed at line 98
- Read: `src/app/api/study-session/route.ts` — existing POST endpoint called from QuizContent

## Implementation Steps

1. In `study-right-panel.tsx:225`, add `passageId={viewingResult.passageId}` to `<QuizContent>`:
   ```tsx
   <QuizContent
     questions={viewingResult.data.questions}
     passageTitle={viewingResult.passageTitle}
     passageId={viewingResult.passageId}
     onReset={() => setViewingResult(null)}
   />
   ```

2. Update `QuizContentProps` in `study-quiz-content.tsx`:
   ```ts
   interface QuizContentProps {
     questions: QuestionData[]
     passageTitle: string
     passageId: string | null  // NEW
     onReset: () => void
   }
   ```

3. Add state to `QuizContent`:
   ```ts
   const [sessionId, setSessionId] = useState<string | null>(null)
   const [attemptId, setAttemptId] = useState<string | null>(null)
   ```

4. Modify `handleCheckAnswer` to create session + attempt on first answer:
   ```ts
   const handleCheckAnswer = useCallback(async () => {
     if (!selectedAnswer || !currentQuestion) return

     if (!sessionId) {
       try {
         // Create study session
         const sessionRes = await fetch('/api/study-session', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ passageId }),
         })
         const sessionData = await sessionRes.json()
         if (!sessionData.success) return
         const newSessionId = sessionData.data.id
         setSessionId(newSessionId)

         // Create quiz attempt
         const attemptRes = await fetch('/api/quiz-attempt', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ studySessionId: newSessionId, passageId }),
         })
         const attemptData = await attemptRes.json()
         if (attemptData.success) setAttemptId(attemptData.data.id)
       } catch {
         // Graceful degradation — still show feedback even if persistence fails
       }
     }

     const isCorrect = selectedAnswer === currentQuestion.correctAnswer
     setAnswers((prev) => ({ ...prev, [currentQuestion.id]: isCorrect }))
     setShowFeedback(true)
   }, [selectedAnswer, currentQuestion, sessionId, passageId])
   ```

5. Pass attemptId to QuizResults:
   ```tsx
   <QuizResults
     correctCount={correctCount}
     totalQuestions={questions.length}
     passageTitle={passageTitle}
     attemptId={attemptId}
     onReset={resetTest}
     onNewPassage={onReset}
   />
   ```

6. Update `QuizResultsProps` in `study-quiz-results.tsx`:
   ```ts
   interface QuizResultsProps {
     correctCount: number
     totalQuestions: number
     passageTitle: string
     attemptId: string | null  // NEW
     onReset: () => void
     onNewPassage: () => void
   }
   ```

7. Add completion effect to `QuizResults`:
   ```ts
   useEffect(() => {
     if (!attemptId) return
     const controller = new AbortController()
     fetch('/api/quiz-attempt', {
       method: 'PATCH',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         attemptId,
         correctCount,
         incorrectCount: totalQuestions - correctCount,
         totalQuestions,
       }),
       signal: controller.signal,
     }).catch(() => {})
     return () => controller.abort()
   }, [attemptId]) // eslint-disable-line react-hooks/exhaustive-deps
   ```

8. Update `resetTest` in `QuizContent`:
   ```ts
   const resetTest = useCallback(() => {
     setCurrentIndex(0)
     setSelectedAnswer(null)
     setShowFeedback(false)
     setAnswers({})
     setIsComplete(false)
     setSessionId(null)   // NEW
     setAttemptId(null)   // NEW
   }, [])
   ```

9. Verify `viewingResult.passageId` is accessible. Confirmed: `ResultItem.passageId` exists at `study-types.ts:98`. The quiz generation flow populates it when creating ResultItem objects.

10. Run `pnpm run typecheck`

## Success Criteria

- [ ] passageId threaded from study-right-panel through QuizContent
- [ ] First answer submission creates StudySession then QuizAttempt (both awaited)
- [ ] sessionId and attemptId stored in state
- [ ] QuizResults receives attemptId and completes attempt on mount
- [ ] accuracyRate computed server-side from correctCount / totalQuestions
- [ ] "Try Again" resets both sessionId and attemptId
- [ ] Next first answer after retry creates new session + attempt
- [ ] Old attempt stays completed with its counts
- [ ] Abandoned quizzes (no completedAt) excluded from stats
- [ ] Graceful degradation if API calls fail (quiz still works)
- [ ] Typecheck passes

## Risk Assessment

- **Risk:** API call delays answer feedback on first answer. **Mitigation:** User explicitly chose "await". Two fast inserts (< 100ms each on Neon). Acceptable UX cost.
- **Risk:** React strict mode double-invokes QuizResults useEffect. **Mitigation:** AbortController cleanup handles this — first call aborted, second succeeds.
- **Risk:** User clicks "Try Again" before PATCH completes. **Mitigation:** PATCH fires in useEffect on mount. If user clicks within ~100ms, attempt stays in "started" state → excluded from stats (completedAt IS NULL). Acceptable.
- **Risk:** `handleCheckAnswer` becomes async, changing callback signature. **Mitigation:** Check all callers — it's only used in keyboard handler and button onClick, both handle async fine.
