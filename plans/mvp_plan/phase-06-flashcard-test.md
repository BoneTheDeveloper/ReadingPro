---
title: "Phase 06: Flashcard Test Implementation"
description: "Build reading comprehension test interface with passage display, multiple-choice questions, source citations, and progress tracking"
status: pending
priority: P1
effort: 8h
branch: main
tags: [test, quiz, flashcards, ui]
created: 2026-04-20
---

# Phase 06: Flashcard Test Implementation

**Status:** pending
**Owner:** unassigned
**Dependencies:** Phase 04, Phase 05

---

## Overview

Build the flashcard-style reading comprehension test interface where users answer questions while the passage remains visible, with source citations highlighting and detailed feedback.

---

## Requirements

### Functional
- Split view: passage (always visible) + question panel
- Progress bar showing question X of Y
- Multiple-choice questions with 4 options
- Answer checking with immediate feedback
- Source citation highlighting in passage
- Explanation panel with quote from passage
- Streak counter for consecutive correct answers
- Results summary at completion
- Keyboard shortcuts (1-4 for options, Enter to submit)
- Responsive: stacked on mobile, side-by-side on desktop

### Non-Functional
- Smooth animations for feedback
- Accessible keyboard navigation
- Touch-friendly on mobile
- Auto-scroll to highlighted source
- Clear visual states (selected, correct, incorrect)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Progress: Question 3 of 5  [████████░░░░]  Streak: 🔥 2            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐  │
│  │     READING PASSAGE         │  │      QUESTION PANEL         │  │
│  │                             │  │                             │  │
│  │  ┌───────────────────────┐  │  │  [1] Multiple Choice      │  │
│  │  │ 1: The quick brown...  │  │  │                             │  │
│  │  │                       │  │  │  According to the passage,  │  │
│  │  │ 2: Artificial          │  │  │  how did AI systems...      │  │
│  │  │ [intelligence]...      │◄─┼──┼────────────────────────────  │  │
│  │  │ (highlighted source)   │  │  │                             │  │
│  │  │                       │  │  │  ○ Option A                  │  │
│  │  │ 3: Over decades, these │  │  │  ○ Option B ◄               │  │
│  │  │    systems evolved...  │  │  │  ○ Option C                  │  │
│  │  │                       │  │  │  ○ Option D                  │  │
│  │  │ 4: However, the rise... │  │  │                             │  │
│  │  │                       │  │  │  [Check Answer]              │  │
│  │  └───────────────────────┘  │  │                             │  │
│  │     (scrollable)            │  │  ┌─────────────────────────┐  │  │
│  │                             │  │  │ ✓ Correct!              │  │  │
│  │                             │  │  │ The passage states...   │  │  │
│  │                             │  │  │                         │  │  │
│  │                             │  │  │ From passage (Line 2):  │  │  │
│  │                             │  │  │ "Over decades, these    │  │  │
│  │                             │  │  │  systems evolved..."    │  │  │
│  │                             │  │  └─────────────────────────┘  │  │
│  │                             │  │                             │  │
│  │                             │  │  [Review Passage] [Next →]  │  │
│  └─────────────────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

COMPLETION STATE:
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                        ✓ Reading Complete!                          │
│                                                                     │
│  You've answered all questions for this passage.                   │
│                                                                     │
│     ┌──────────────┐    ┌──────────────┐                           │
│     │     4        │    │     1        │                           │
│     │  Correct     │    │   Review     │                           │
│     └──────────────┘    └──────────────┘                           │
│                                                                     │
│                      [Continue Reading]                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Related Code Files

### Files to Create
- `src/app/(dashboard)/test/[id]/page.tsx` - Test page
- `src/components/flashcard-test.tsx` - Main test component
- `src/components/passage-panel.tsx` - Passage display with line numbers
- `src/components/question-panel.tsx` - Question and options
- `src/components/feedback-panel.tsx` - Answer feedback with citations
- `src/components/test-results.tsx` - Completion summary

### Files to Modify
- `src/lib/db-utils.ts` - Add test-related queries

---

## Implementation Steps

### 1. Create Test Types and Utilities

**File:** `src/lib/test-utils.ts`

```typescript
import { Question } from '@prisma/client';

export interface TestQuestion {
  id: string;
  number: number;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  questionText: string;
  options: Array<{ id: string; text: string }>;
  correctAnswer: string;
  explanation: string;
  sourceText: string;
  sourceLine: number;
}

export interface TestState {
  currentIndex: number;
  answers: Map<string, string>; // questionId -> selectedOptionId
  results: Map<string, boolean>; // questionId -> isCorrect
  streak: number;
  isComplete: boolean;
}

export interface PassageLine {
  lineNumber: number;
  text: string;
  hasHighlight?: boolean;
}

export function parsePassageLines(content: string): PassageLine[] {
  return content
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map((text, i) => ({
      lineNumber: i + 1,
      text: text.trim(),
      hasHighlight: false,
    }));
}

export function highlightSourceLine(
  lines: PassageLine[],
  lineNumber: number
): PassageLine[] {
  return lines.map(line =>
    line.lineNumber === lineNumber
      ? { ...line, hasHighlight: true }
      : line
  );
}

export function calculateTestResults(state: TestState) {
  const total = state.results.size;
  const correct = Array.from(state.results.values()).filter(Boolean).length;
  const incorrect = total - correct;
  const accuracy = total > 0 ? (correct / total) * 100 : 0;

  return { total, correct, incorrect, accuracy };
}
```

### 2. Create Passage Panel Component

**File:** `src/components/passage-panel.tsx`

```typescript
'use client';

import { useRef, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { cn, getCEFRColor } from '@/lib/utils';
import { PassageLine } from '@/lib/test-utils';
import { CEFRLevel } from '@prisma/client';

interface PassagePanelProps {
  title: string;
  lines: PassageLine[];
  level: CEFRLevel;
  wordCount?: number;
  className?: string;
  highlightRef?: React.RefObject<HTMLDivElement>;
}

export function PassagePanel({
  title,
  lines,
  level,
  wordCount,
  className,
  highlightRef,
}: PassagePanelProps) {
  const passageRef = useRef<HTMLDivElement>(null);

  // Scroll to highlighted line when ref changes
  useEffect(() => {
    if (highlightRef?.current && passageRef.current) {
      const container = passageRef.current;
      const target = highlightRef.current;
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      if (targetRect.top < containerRect.top || targetRect.bottom > containerRect.bottom) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightRef]);

  return (
    <div className={cn('bg-white rounded-2xl border border-neutral-200 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
        <h2 className="font-semibold text-neutral-900">{title}</h2>
        <div className="flex items-center gap-3">
          <span className={cn('px-2 py-1 rounded-full text-xs font-semibold', getCEFRColor(level))}>
            {level}
          </span>
          {wordCount && (
            <span className="text-xs text-neutral-500">
              ~{Math.ceil(wordCount / 200)} min read
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        ref={passageRef}
        className="p-6 max-h-[500px] overflow-y-auto font-serif text-lg leading-relaxed text-neutral-700"
      >
        {lines.map((line, i) => (
          <div
            key={i}
            ref={line.hasHighlight ? highlightRef : null}
            className="relative pl-10 mb-4 last:mb-0"
          >
            {/* Line Number */}
            <span className="absolute left-0 top-0 text-xs text-neutral-400 font-sans w-6 text-right font-medium">
              {line.lineNumber}
            </span>

            {/* Line Content */}
            <span
              className={cn(
                'transition-colors',
                line.hasHighlight && 'bg-gradient-to-t from-primary-100 to-transparent rounded px-1 -mx-1'
              )}
            >
              {line.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. Create Question Panel Component

**File:** `src/components/question-panel.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TestQuestion } from '@/lib/test-utils';

interface QuestionPanelProps {
  question: TestQuestion;
  currentIndex: number;
  totalQuestions: number;
  streak: number;
  selectedOption: string | null;
  answered: boolean;
  onOptionSelect: (optionId: string) => void;
  onSubmit: () => void;
  onNext: () => void;
}

export function QuestionPanel({
  question,
  currentIndex,
  totalQuestions,
  streak,
  selectedOption,
  answered,
  onOptionSelect,
  onSubmit,
  onNext,
}: QuestionPanelProps) {
  const result = answered
    ? selectedOption === question.correctAnswer
    : null;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
            {question.number}
          </span>
          <span className="text-xs text-neutral-500 uppercase tracking-wide font-medium">
            {question.type === 'MULTIPLE_CHOICE' ? 'Multiple Choice' : 'True / False'}
          </span>
        </div>

        {streak > 1 && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-warning-50 text-warning-700 rounded-full text-xs font-semibold">
            🔥 {streak} streak
          </div>
        )}
      </div>

      {/* Question */}
      <h3 className="text-lg font-semibold text-neutral-900 mb-5 leading-relaxed">
        {question.questionText}
      </h3>

      {/* Options */}
      <div className="space-y-3 mb-5">
        {question.options.map((option) => {
          const isSelected = selectedOption === option.id;
          const isCorrect = option.id === question.correctAnswer;
          const showResult = answered && (isSelected || isCorrect);

          return (
            <button
              key={option.id}
              onClick={() => !answered && onOptionSelect(option.id)}
              disabled={answered}
              className={cn(
                'w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
                'disabled:cursor-default',
                !answered && 'border-neutral-200 hover:border-primary-300 hover:bg-primary-50',
                !answered && isSelected && 'border-primary-500 bg-primary-50',
                answered && isCorrect && 'border-success-500 bg-success-50',
                answered && isSelected && !isCorrect && 'border-error-500 bg-error-50',
                answered && !isSelected && !isCorrect && 'border-neutral-200 opacity-50'
              )}
            >
              {/* Radio */}
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                  !answered && 'border-neutral-300',
                  !answered && isSelected && 'border-primary-500',
                  answered && isCorrect && 'border-success-500',
                  answered && isSelected && !isCorrect && 'border-error-500'
                )}
              >
                {(answered && isCorrect) || (answered && isSelected) ? (
                  <span
                    className={cn(
                      'w-2.5 h-2.5 rounded-full',
                      answered && isCorrect && 'bg-success-500',
                      answered && isSelected && !isCorrect && 'bg-error-500'
                    )}
                  />
                ) : null}
              </div>

              {/* Text */}
              <span className="flex-1 text-neutral-700">{option.text}</span>

              {/* Result Icon */}
              {answered && isCorrect && (
                <Check className="w-5 h-5 text-success-500 flex-shrink-0" />
              )}
              {answered && isSelected && !isCorrect && (
                <X className="w-5 h-5 text-error-500 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Submit / Feedback */}
      {!answered ? (
        <Button
          onClick={onSubmit}
          disabled={!selectedOption}
          className="w-full"
          size="lg"
        >
          Check Answer
        </Button>
      ) : (
        <FeedbackContent
          question={question}
          isCorrect={result === true}
          onNext={onNext}
        />
      )}
    </div>
  );
}

interface FeedbackContentProps {
  question: TestQuestion;
  isCorrect: boolean;
  onNext: () => void;
}

function FeedbackContent({ question, isCorrect, onNext }: FeedbackContentProps) {
  return (
    <div className="space-y-4">
      {/* Feedback */}
      <div
        className={cn(
          'p-4 rounded-xl',
          isCorrect
            ? 'bg-success-50 border border-success-200'
            : 'bg-error-50 border border-error-200'
        )}
      >
        <div className={cn('flex items-center gap-2 mb-2 font-semibold', isCorrect ? 'text-success-700' : 'text-error-700')}>
          {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          <span>{isCorrect ? 'Correct!' : 'Not quite right'}</span>
        </div>
        <p className="text-sm text-neutral-700">{question.explanation}</p>
      </div>

      {/* Source Citation */}
      <div className="bg-white border border-neutral-200 rounded-lg p-3">
        <p className="text-xs text-neutral-500 mb-1 flex items-center gap-1.5 font-medium">
          From the passage (Line {question.sourceLine}):
        </p>
        <p className="text-sm text-neutral-600 italic font-serif">
          "{question.sourceText}"
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {/* Scroll to passage */}}
        >
          <Eye className="w-4 h-4 mr-2" />
          Review Passage
        </Button>
        <Button className="flex-1" onClick={onNext}>
          Next Question →
        </Button>
      </div>
    </div>
  );
}
```

### 4. Create Test Results Component

**File:** `src/components/test-results.tsx`

```typescript
'use client';

import { Trophy, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface TestResultsProps {
  correct: number;
  incorrect: number;
  accuracy: number;
}

export function TestResults({ correct, incorrect, accuracy }: TestResultsProps) {
  const router = useRouter();

  const scoreLabel = accuracy >= 80 ? 'Excellent!' : accuracy >= 60 ? 'Good job!' : 'Keep practicing!';

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10 text-success-500" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Reading Complete!
        </h2>

        <p className="text-neutral-500 mb-8">
          You've answered all questions for this passage.
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600">{correct}</div>
            <div className="text-sm text-neutral-500">Correct</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-error-500">{incorrect}</div>
            <div className="text-sm text-neutral-500">Review</div>
          </div>
        </div>

        {/* Score Label */}
        <div className="bg-neutral-100 rounded-xl p-4 mb-8">
          <p className="text-lg font-semibold text-neutral-900">{scoreLabel}</p>
          <p className="text-sm text-neutral-500">
            {accuracy.toFixed(0)}% accuracy
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            Review Answers
          </Button>
          <Button
            className="flex-1"
            onClick={() => router.push('/upload')}
          >
            <Target className="w-4 h-4 mr-2" />
            Continue Reading
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 5. Create Main Test Component

**File:** `src/components/flashcard-test.tsx`

```typescript
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { PassagePanel } from './passage-panel';
import { QuestionPanel } from './question-panel';
import { TestResults } from './test-results';
import {
  TestQuestion,
  TestState,
  parsePassageLines,
  highlightSourceLine,
  calculateTestResults,
} from '@/lib/test-utils';
import { Question } from '@prisma/client';

interface FlashcardTestProps {
  passage: {
    id: string;
    title: string;
    content: string;
    originalLevel: string;
    simplifiedContent: string | null;
  };
  questions: Question[];
}

export function FlashcardTest({ passage, questions }: FlashcardTestProps) {
  // Parse questions
  const testQuestions: TestQuestion[] = questions.map((q, i) => ({
    id: q.id,
    number: i + 1,
    type: q.questionType as any,
    questionText: q.questionText,
    options: JSON.parse(q.options as string),
    correctAnswer: q.correctOption,
    explanation: q.explanation,
    sourceText: q.sourceText,
    sourceLine: q.sourceLine,
  }));

  // State
  const [state, setState] = useState<TestState>({
    currentIndex: 0,
    answers: new Map(),
    results: new Map(),
    streak: 0,
    isComplete: false,
  });

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const currentQuestion = testQuestions[state.currentIndex];
  const highlightRef = useRef<HTMLDivElement>(null);

  // Passage lines with current highlight
  const passageLines = answered
    ? highlightSourceLine(
        parsePassageLines(passage.content),
        currentQuestion.sourceLine
      )
    : parsePassageLines(passage.content);

  // Reset state when question changes
  useEffect(() => {
    setSelectedOption(null);
    setAnswered(false);
  }, [state.currentIndex]);

  // Handlers
  const handleOptionSelect = useCallback((optionId: string) => {
    if (!answered) {
      setSelectedOption(optionId);
    }
  }, [answered]);

  const handleSubmit = useCallback(() => {
    if (!selectedOption) return;

    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    const newStreak = isCorrect ? state.streak + 1 : 0;

    const newAnswers = new Map(state.answers);
    newAnswers.set(currentQuestion.id, selectedOption);

    const newResults = new Map(state.results);
    newResults.set(currentQuestion.id, isCorrect);

    setState({
      ...state,
      answers: newAnswers,
      results: newResults,
      streak: newStreak,
    });

    setAnswered(true);
  }, [selectedOption, currentQuestion, state]);

  const handleNext = useCallback(() => {
    if (state.currentIndex < testQuestions.length - 1) {
      setState({ ...state, currentIndex: state.currentIndex + 1 });
    } else {
      setState({ ...state, isComplete: true });
    }
  }, [state, testQuestions.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '4' && !answered) {
        const optionIndex = parseInt(e.key) - 1;
        const option = currentQuestion.options[optionIndex];
        if (option) {
          handleOptionSelect(option.id);
        }
      } else if (e.key === 'Enter') {
        if (answered) {
          handleNext();
        } else if (selectedOption) {
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [answered, selectedOption, handleOptionSelect, handleSubmit, handleNext, currentQuestion]);

  // Results view
  if (state.isComplete) {
    const { correct, incorrect, accuracy } = calculateTestResults(state);
    return <TestResults correct={correct} incorrect={incorrect} accuracy={accuracy} />;
  }

  // Progress
  const progress = ((state.currentIndex + 1) / testQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Progress Bar */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between mb-2">
          <span className="text-sm text-neutral-600">
            Question Progress
          </span>
          <span className="text-sm font-semibold text-neutral-900">
            Question {state.currentIndex + 1} of {testQuestions.length}
          </span>
        </div>
        <div className="max-w-6xl mx-auto h-1.5 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-6 lg:items-start">
          {/* Passage */}
          <div className="mb-6 lg:mb-0">
            <PassagePanel
              title={passage.title}
              lines={passageLines}
              level={passage.originalLevel as any}
              wordCount={passage.content.split(/\s+/).length}
              highlightRef={highlightRef}
            />
          </div>

          {/* Question */}
          <div>
            <QuestionPanel
              question={currentQuestion}
              currentIndex={state.currentIndex}
              totalQuestions={testQuestions.length}
              streak={state.streak}
              selectedOption={selectedOption}
              answered={answered}
              onOptionSelect={handleOptionSelect}
              onSubmit={handleSubmit}
              onNext={handleNext}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 6. Create Test Page

**File:** `src/app/(dashboard)/test/[id]/page.tsx`

```typescript
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { FlashcardTest } from '@/components/flashcard-test';

interface TestPageProps {
  params: { id: string };
}

export default async function TestPage({ params }: TestPageProps) {
  const passage = await db.passage.findUnique({
    where: { id: params.id },
    include: { questions: true },
  });

  if (!passage) {
    notFound();
  }

  return (
    <FlashcardTest
      passage={{
        id: passage.id,
        title: passage.title,
        content: passage.simplifiedContent || passage.content,
        originalLevel: passage.originalLevel,
        simplifiedContent: passage.simplifiedContent,
      }}
      questions={passage.questions}
    />
  );
}
```

---

## Todo List

- [ ] Create test types and utilities
- [ ] Create passage panel with line numbers
- [ ] Create question panel with options
- [ ] Create feedback content component
- [ ] Create test results component
- [ ] Create main flashcard test component
- [ ] Create test page
- [ ] Implement keyboard shortcuts
- [ ] Add source citation highlighting
- [ ] Test responsive behavior

---

## Success Criteria

1. ✅ Passage displays with line numbers
2. ✅ Questions display with 4 clickable options
3. ✅ Answer checking shows correct/incorrect states
4. ✅ Source citations highlight in passage
5. ✅ Passage auto-scrolls to highlighted source
6. ✅ Progress bar updates correctly
7. ✅ Streak counter updates with correct answers
8. ✅ Results summary shows at completion
9. ✅ Keyboard shortcuts (1-4, Enter) work
10. ✅ Responsive: stacked mobile, side-by-side desktop

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Source line number mismatch | Medium | Validate line numbers during generation |
| Mobile passage too small | Low | Optimize font sizes, add expand button |
| State management bugs | Medium | Use proper React patterns, test thoroughly |

---

## Next Steps

After completion:
- Proceed to [Phase 07: Progress Tracking](phase-07-progress-tracking.md)

---

## Context Links

- [Flashcard View Wireframe](../../docs/wireframe/flashcard-view.html)
- [SM-2 Algorithm Research](../reports/researcher-flashcard-educational-systems-2024.md)
- [Question Generation](phase-04-gemini-integration.md)
