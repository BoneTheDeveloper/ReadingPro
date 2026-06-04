import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { createRequestLogContext, createRequestLogger } from '@/lib/core/logger';
import { createStudySession, updateStudySession } from '@/lib/db/study-session-queries';

const studySessionPostSchema = z.object({
  passageId: z.string().uuid().optional(),
});

const studySessionPatchSchema = z.object({
  sessionId: z.string().uuid(),
  cardsReviewed: z.number().int().nonnegative().optional().default(0),
  correctCount: z.number().int().nonnegative().optional().default(0),
  incorrectCount: z.number().int().nonnegative().optional().default(0),
});

export async function POST(request: NextRequest) {
  const requestLog = createRequestLogger(
    'api:study-session',
    createRequestLogContext(request, 'POST', '/api/study-session'),
  );

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const parsed = studySessionPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { passageId } = parsed.data;
    const user = await getAuthenticatedUser();

    const session = await Sentry.startSpan({ name: 'db:session-create', op: 'db' }, async () => {
      return createStudySession(user.id, passageId);
    });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    }
    requestLog.error({ err: error }, 'Failed to create session');
    Sentry.captureException(error, {
      tags: { route: 'api:study-session', method: 'POST' },
    });
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const requestLog = createRequestLogger(
    'api:study-session',
    createRequestLogContext(request, 'PATCH', '/api/study-session'),
  );

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const parsed = studySessionPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { sessionId, cardsReviewed, correctCount, incorrectCount } = parsed.data;
    const user = await getAuthenticatedUser();

    const updated = await Sentry.startSpan({ name: 'db:session-update', op: 'db' }, async () => {
      return updateStudySession(user.id, sessionId, {
        completedAt: new Date(),
        cardsReviewed,
        correctCount,
        incorrectCount,
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    }
    requestLog.error({ err: error }, 'Failed to update session');
    Sentry.captureException(error, {
      tags: { route: 'api:study-session', method: 'PATCH' },
    });
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}
