---
title: "Phase 07: Progress Tracking Implementation"
description: "Implement SM-2 spaced repetition algorithm, progress dashboard, card review scheduling, and study session tracking"
status: pending
priority: P1
effort: 5h
branch: main
tags: [progress, spaced-repetition, sm2, dashboard]
created: 2026-04-20
---

# Phase 07: Progress Tracking Implementation

**Status:** pending
**Owner:** unassigned
**Dependencies:** Phase 02, Phase 06

---

## Overview

Implement the progress tracking system including SM-2 spaced repetition algorithm for scheduling card reviews, study session tracking, and a progress dashboard showing user statistics.

---

## Requirements

### Functional
- SM-2 algorithm for calculating review intervals
- Card scheduling based on performance
- Study session tracking (start/end, accuracy)
- Progress dashboard with statistics:
  - Total cards, mature cards, due cards
  - Today's reviews count
  - Accuracy rate
  - Streak counter
- Due cards queue for review sessions
- Manual card review interface

### Non-Functional
- Efficient queries for due cards
- Proper index usage for performance
- Accurate interval calculations
- Session persistence on interruption

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Progress Dashboard                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Due Cards: 12  |  Mature: 45  |  Today: 8 reviews      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Start Study   │  │   View Stats    │  │   Card Queue    │  │
│  │     Session     │  │                 │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                      SM-2 Algorithm                              │
│                                                                  │
│  Quality Rating (0-5) → Ease Factor → Interval → Next Review   │
│                                                                  │
│  Example:                                                       │
│  - Rating 4 (good): EF 2.5 → 2.46, Interval 1 → 6 days         │
│  - Rating 2 (poor):  EF 2.5 → 1.7,  Interval 6 → 1 day          │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Study Session Flow                          │
│                                                                  │
│  1. Start session (create StudySession record)                  │
│  2. Fetch due cards (ordered by nextReviewDate)                 │
│  3. Present card → User rates (0-5)                             │
│  4. Update SM-2 values → Schedule next review                   │
│  5. Repeat until no more cards                                  │
│  6. Complete session (update stats)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Code Files

### Files to Create
- `src/lib/sm2-algorithm.ts` - SM-2 implementation (already in db-utils)
- `src/app/(dashboard)/progress/page.tsx` - Progress dashboard
- `src/components/progress-dashboard.tsx` - Dashboard UI
- `src/components/study-session.tsx` - Active study session
- `src/components/card-review-card.tsx` - Individual card for review
- `src/app/api/cards/due/route.ts` - Fetch due cards API
- `src/app/api/cards/review/route.ts` - Submit card review API

### Files to Modify
- `src/lib/db-utils.ts` - Complete SM-2 and progress utilities

---

## Implementation Steps

### 1. Complete SM-2 Algorithm (Already in Phase 02)

The SM-2 implementation is already defined in `phase-02-database-schema.md`. Here's the complete utility:

**File:** `src/lib/sm2-algorithm.ts` (if separating from db-utils)

```typescript
/**
 * SM-2 (SuperMemo 2) Spaced Repetition Algorithm
 *
 * Quality Rating Scale:
 * 5 - Perfect response (no hesitation)
 * 4 - Correct response after slight hesitation
 * 3 - Correct response recalled with serious difficulty
 * 2 - Incorrect response; where the correct one seemed easy to recall
 * 1 - Incorrect response; but the correct one was remembered
 * 0 - Complete blackout (no memory of answer)
 *
 * Reference: http://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

export interface SM2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface SM2Result extends SM2State {
  nextReviewDate: Date;
}

export function calculateSM2Interval(
  previousState: SM2State,
  qualityRating: number
): SM2Result {
  let { easeFactor, intervalDays, repetitions } = previousState;

  // Quality < 3 means failed recall - reset
  if (qualityRating < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;

    // Calculate new ease factor
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    easeFactor = easeFactor + (0.1 - (5 - qualityRating) * (0.08 + (5 - qualityRating) * 0.02));
    easeFactor = Math.max(1.3, easeFactor); // Minimum EF of 1.3

    // Calculate interval based on repetition number
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

  return {
    easeFactor: Number(easeFactor.toFixed(2)),
    intervalDays,
    repetitions,
    nextReviewDate,
  };
}

/**
 * Get suggested quality rating based on response type
 */
export function getSuggestedRating(
  responseType: 'perfect' | 'correct' | 'difficult' | 'wrong' | 'blackout'
): number {
  const ratings = {
    perfect: 5,
    correct: 4,
    difficult: 3,
    wrong: 2,
    blackout: 0,
  };
  return ratings[responseType];
}

/**
 * Check if card is due for review
 */
export function isCardDue(nextReviewDate: Date): boolean {
  return nextReviewDate <= new Date();
}

/**
 * Get card status for UI display
 */
export function getCardStatus(nextReviewDate: Date, intervalDays: number): {
  status: 'new' | 'learning' | 'review' | 'mature';
  label: string;
  color: string;
} {
  const now = new Date();

  if (intervalDays === 0) {
    return { status: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' };
  }

  if (intervalDays < 21) {
    return { status: 'learning', label: 'Learning', color: 'bg-yellow-100 text-yellow-700' };
  }

  if (isCardDue(nextReviewDate)) {
    return { status: 'review', label: 'Due', color: 'bg-orange-100 text-orange-700' };
  }

  return { status: 'mature', label: 'Scheduled', color: 'bg-green-100 text-green-700' };
}
```

### 2. Create Card Review API Routes

**File:** `src/app/api/cards/due/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDueCards } from '@/lib/db-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user'; // TODO: Use auth

    const dueCards = await getDueCards(userId);

    return NextResponse.json({
      success: true,
      data: dueCards,
    });
  } catch (error) {
    console.error('Error fetching due cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch due cards' },
      { status: 500 }
    );
  }
}
```

**File:** `src/app/api/cards/review/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { updateCardReview } from '@/lib/db-utils';

export async function POST(request: NextRequest) {
  try {
    const { cardReviewId, qualityRating } = await request.json();

    if (!cardReviewId || typeof qualityRating !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    if (qualityRating < 0 || qualityRating > 5) {
      return NextResponse.json(
        { error: 'Quality rating must be between 0 and 5' },
        { status: 400 }
      );
    }

    const updatedReview = await updateCardReview(cardReviewId, qualityRating);

    return NextResponse.json({
      success: true,
      data: updatedReview,
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
```

### 3. Create Study Session API Route

**File:** `src/app/api/study-session/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Start a new study session
export async function POST(request: NextRequest) {
  try {
    const { userId, passageId } = await request.json();

    const session = await db.studySession.create({
      data: {
        userId: userId || 'demo-user',
        passageId,
        startedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

// Complete a study session
export async function PATCH(request: NextRequest) {
  try {
    const { sessionId, cardsReviewed, correctCount, incorrectCount } = await request.json();

    const session = await db.studySession.update({
      where: { id: sessionId },
      data: {
        completedAt: new Date(),
        cardsReviewed,
        correctCount,
        incorrectCount,
        accuracyRate: (correctCount / (correctCount + incorrectCount)) * 100,
      },
    });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}
```

### 4. Create Progress Dashboard Component

**File:** `src/components/progress-dashboard.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Target, Flame, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProgressStats {
  totalCards: number;
  matureCards: number;
  dueCards: number;
  todayReviews: number;
}

export function ProgressDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/progress/stats');
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-neutral-500">Loading...</div>;
  }

  if (!stats) {
    return <div className="p-8 text-center text-neutral-500">Failed to load stats</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            Your Progress
          </h1>
          <p className="text-neutral-500">
            Track your learning journey and review due cards
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<BookOpen className="w-5 h-5" />}
            label="Total Cards"
            value={stats.totalCards}
            color="bg-primary-50 text-primary-700"
          />
          <StatCard
            icon={<Target className="w-5 h-5" />}
            label="Due for Review"
            value={stats.dueCards}
            color="bg-orange-50 text-orange-700"
            highlight={stats.dueCards > 0}
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Mature Cards"
            value={stats.matureCards}
            color="bg-green-50 text-green-700"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Today's Reviews"
            value={stats.todayReviews}
            color="bg-blue-50 text-blue-700"
          />
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {stats.dueCards > 0 ? (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Flame className="w-6 h-6 text-orange-600" />
                    <div>
                      <h3 className="font-semibold text-neutral-900">
                        {stats.dueCards} cards due for review
                      </h3>
                      <p className="text-sm text-neutral-600">
                        Keep your streak alive!
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => router.push('/review')}>
                    Start Review →
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🎉</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">
                      All caught up!
                    </h3>
                    <p className="text-sm text-neutral-600">
                      No cards due right now. Upload new content to continue learning.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-24 flex-col"
              onClick={() => router.push('/upload')}
            >
              <BookOpen className="w-6 h-6 mb-2" />
              <span>Add New Content</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col"
              onClick={() => router.push('/history')}
            >
              <TrendingUp className="w-6 h-6 mb-2" />
              <span>View History</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  highlight?: boolean;
}

function StatCard({ icon, label, value, color, highlight }: StatCardProps) {
  return (
    <Card className={cn('border-2', highlight && 'border-current')}>
      <CardContent className={cn('p-4', color)}>
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-sm font-medium opacity-80">{label}</span>
        </div>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
```

### 5. Create Card Review Component

**File:** `src/components/card-review-card.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Check, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Question } from '@prisma/client';
import { getCardStatus } from '@/lib/sm2-algorithm';

interface CardReviewCardProps {
  question: Question & { nextReviewDate: Date; intervalDays: number };
  onAnswer: (rating: number) => void;
}

export function CardReviewCard({ question, onAnswer }: CardReviewCardProps) {
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const options = JSON.parse(question.options as string);
  const isCorrect = selectedOption === question.correctOption;

  const handleCheck = () => {
    if (!selectedOption) return;
    setAnswered(true);
  };

  const handleRate = (rating: number) => {
    onAnswer(rating);
    // Reset for next card
    setAnswered(false);
    setSelectedOption(null);
  };

  const cardStatus = getCardStatus(question.nextReviewDate as any, question.intervalDays);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className={cn('px-2 py-1 rounded-full text-xs font-semibold', cardStatus.color)}>
            {cardStatus.label}
          </span>
          <span className="text-xs text-neutral-500">
            Question about passage
          </span>
        </div>

        {/* Question */}
        <h3 className="text-lg font-semibold text-neutral-900 mb-6">
          {question.questionText}
        </h3>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {options.map((option: any) => {
            const isSelected = selectedOption === option.id;
            const isCorrectOption = option.id === question.correctOption;

            return (
              <button
                key={option.id}
                onClick={() => !answered && setSelectedOption(option.id)}
                disabled={answered}
                className={cn(
                  'w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
                  !answered && 'border-neutral-200 hover:border-primary-300 hover:bg-primary-50',
                  !answered && isSelected && 'border-primary-500 bg-primary-50',
                  answered && isCorrectOption && 'border-success-500 bg-success-50',
                  answered && isSelected && !isCorrectOption && 'border-error-500 bg-error-50'
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex-shrink-0',
                  !answered && 'border-neutral-300',
                  !answered && isSelected && 'border-primary-500',
                  answered && isCorrectOption && 'border-success-500 bg-success-500',
                  answered && isSelected && !isCorrectOption && 'border-error-500 bg-error-500'
                )} />
                <span className="flex-1">{option.text}</span>
                {answered && isCorrectOption && <Check className="w-5 h-5 text-success-500" />}
                {answered && isSelected && !isCorrectOption && <X className="w-5 h-5 text-error-500" />}
              </button>
            );
          })}
        </div>

        {!answered ? (
          <Button
            onClick={handleCheck}
            disabled={!selectedOption}
            className="w-full"
            size="lg"
          >
            Check Answer
          </Button>
        ) : (
          <RatingSection
            isCorrect={isCorrect}
            onRate={handleRate}
          />
        )}
      </div>
    </Card>
  );
}

interface RatingSectionProps {
  isCorrect: boolean;
  onRate: (rating: number) => void;
}

function RatingSection({ isCorrect, onRate }: RatingSectionProps) {
  return (
    <div className="space-y-4">
      <div className={cn(
        'p-4 rounded-xl text-center',
        isCorrect ? 'bg-success-50 text-success-700' : 'bg-error-50 text-error-700'
      )}>
        {isCorrect ? (
          <>
            <Check className="w-6 h-6 mx-auto mb-2" />
            <p className="font-semibold">Correct!</p>
          </>
        ) : (
          <>
            <X className="w-6 h-6 mx-auto mb-2" />
            <p className="font-semibold">Not quite right</p>
          </>
        )}
      </div>

      <div>
        <p className="text-sm text-neutral-600 mb-3 text-center">
          How well did you know this?
        </p>
        <div className="grid grid-cols-5 gap-2">
          <RatingButton label="Again" rating={1} color="bg-red-100 hover:bg-red-200" onRate={onRate} />
          <RatingButton label="Hard" rating={3} color="bg-orange-100 hover:bg-orange-200" onRate={onRate} />
          <RatingButton label="Good" rating={4} color="bg-blue-100 hover:bg-blue-200" onRate={onRate} />
          <RatingButton label="Easy" rating={5} color="bg-green-100 hover:bg-green-200" onRate={onRate} />
        </div>
      </div>
    </div>
  );
}

interface RatingButtonProps {
  label: string;
  rating: number;
  color: string;
  onRate: (rating: number) => void;
}

function RatingButton({ label, rating, color, onRate }: RatingButtonProps) {
  return (
    <button
      onClick={() => onRate(rating)}
      className={cn('py-3 rounded-lg font-medium text-sm transition-colors', color)}
    >
      {label}
    </button>
  );
}
```

### 6. Create Progress Stats API

**File:** `src/app/api/progress/stats/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserProgress } from '@/lib/db-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user';

    const stats = await getUserProgress(userId);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching progress stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
```

### 7. Create Progress Page

**File:** `src/app/(dashboard)/progress/page.tsx`

```typescript
import { ProgressDashboard } from '@/components/progress-dashboard';

export default function ProgressPage() {
  return <ProgressDashboard />;
}
```

---

## Todo List

- [ ] Verify SM-2 algorithm implementation
- [ ] Create card review API routes
- [ ] Create study session API route
- [ ] Create progress dashboard component
- [ ] Create card review card component
- [ ] Create progress stats API
- [ ] Create progress page
- [ ] Test due card scheduling
- [ ] Verify interval calculations
- [ ] Test study session flow

---

## Success Criteria

1. ✅ Due cards fetch correctly with proper ordering
2. ✅ SM-2 intervals calculate accurately
3. ✅ Card reviews update nextReviewDate correctly
4. ✅ Progress dashboard shows accurate stats
5. ✅ Study sessions track start/end and accuracy
6. ✅ Mature cards (21+ days) identified correctly
7. ✅ Today's reviews count resets at midnight

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| SM-2 calculation errors | High | Unit test with known values from SuperMemo paper |
| Timezone issues with due dates | Medium | Store and compare dates in UTC |
| Large due card queues | Low | Implement pagination, limit session size |
| Session state loss | Low | Persist session state to database |

---

## Next Steps

After completion:
- MVP is complete! Consider Phase 2 features:
  - User authentication
  - YouTube transcription
  - Advanced analytics
  - Mobile app (React Native)

---

## Context Links

- [SM-2 Algorithm Paper](http://www.supermemo.com/en/archives1990-2015/english/ol/sm2)
- [Dashboard Wireframe](../../docs/wireframe/dashboard-view.html)
- [Spaced Repetition Research](../reports/researcher-flashcard-educational-systems-2024.md)
- [Phase 02: Database Schema](phase-02-database-schema.md)
