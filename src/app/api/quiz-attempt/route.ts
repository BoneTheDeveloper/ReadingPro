import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { createRequestLogContext, createRequestLogger } from '@/lib/core/logger';
import {
  createQuizAttempt,
  completeQuizAttempt,
} from '@/lib/db/quiz-attempt-queries';
import { toQuizAttemptDto } from '@/lib/study/shared/study-response-schema';

const quizAttemptPostSchema = z.object({
  studySessionId: z.string().uuid(),
  passageId: z.string().uuid().optional(),
});

const quizAttemptPatchSchema = z.object({
  attemptId: z.string().uuid(),
  correctCount: z.number().int().nonnegative(),
  incorrectCount: z.number().int().nonnegative(),
  totalQuestions: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const requestLog = createRequestLogger(
    'api:quiz-attempt',
    createRequestLogContext(request, 'POST', '/api/quiz-attempt'),
  );

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const parsed = quizAttemptPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { studySessionId, passageId } = parsed.data;
    const user = await getAuthenticatedUser();

    const attempt = await Sentry.startSpan({ name: 'db:quiz-attempt-create', op: 'db' }, async () => {
      return createQuizAttempt(studySessionId, user.id, passageId);
    });

    return NextResponse.json({ success: true, data: toQuizAttemptDto(attempt) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    }
    requestLog.error({ err: error }, 'Failed to create quiz attempt');
    Sentry.captureException(error, {
      tags: { route: 'api:quiz-attempt', method: 'POST' },
    });
    return NextResponse.json(
      { error: 'Failed to create quiz attempt' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const requestLog = createRequestLogger(
    'api:quiz-attempt',
    createRequestLogContext(request, 'PATCH', '/api/quiz-attempt'),
  );

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const parsed = quizAttemptPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { attemptId, correctCount, incorrectCount, totalQuestions } = parsed.data;
    const user = await getAuthenticatedUser();

    const completed = await Sentry.startSpan({ name: 'db:quiz-attempt-complete', op: 'db' }, async () => {
      return completeQuizAttempt(attemptId, user.id, {
        correctCount,
        incorrectCount,
        totalQuestions,
      });
    });

    return NextResponse.json({ success: true, data: toQuizAttemptDto(completed) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    }
    requestLog.error({ err: error }, 'Failed to complete quiz attempt');
    Sentry.captureException(error, {
      tags: { route: 'api:quiz-attempt', method: 'PATCH' },
    });
    return NextResponse.json(
      { error: 'Failed to complete quiz attempt' },
      { status: 500 },
    );
  }
}
