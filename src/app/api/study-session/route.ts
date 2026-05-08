import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db/client';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { createModuleLogger } from '@/lib/core/logger';
import { computeSessionAccuracy } from '@/lib/db/study-session-queries';

const log = createModuleLogger('api:study-session');

const studySessionPostSchema = z.object({
  passageId: z.string().optional(),
});

const studySessionPatchSchema = z.object({
  sessionId: z.string().min(1),
  cardsReviewed: z.number().int().nonnegative().optional().default(0),
  correctCount: z.number().int().nonnegative().optional().default(0),
  incorrectCount: z.number().int().nonnegative().optional().default(0),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = studySessionPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { passageId } = parsed.data;
    const user = await getAuthenticatedUser();

    if (passageId) {
      const passage = await db.passage.findUnique({ where: { id: passageId, userId: user.id } });
      if (!passage) {
        return NextResponse.json({ error: 'Passage not found or not owned by user' }, { status: 400 });
      }
    }

    const session = await Sentry.startSpan({ name: 'db:session-create', op: 'db' }, async () => {
      return db.studySession.create({
        data: {
          userId: user.id,
          passageId,
          startedAt: new Date(),
        },
      });
    });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    log.error({ err: error }, 'Failed to create session');
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
  try {
    const body = await request.json();
    const parsed = studySessionPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { sessionId, cardsReviewed, correctCount, incorrectCount } = parsed.data;
    const user = await getAuthenticatedUser();

    const session = await Sentry.startSpan({ name: 'db:session-verify', op: 'db' }, async () => {
      return db.studySession.findUniqueOrThrow({
        where: { id: sessionId, userId: user.id },
      });
    });

    const accuracyRate = await computeSessionAccuracy(session.id, user.id);

    const updated = await Sentry.startSpan({ name: 'db:session-update', op: 'db' }, async () => {
      return db.studySession.update({
        where: { id: sessionId },
        data: {
          completedAt: new Date(),
          cardsReviewed,
          correctCount,
          incorrectCount,
          accuracyRate,
        },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    log.error({ err: error }, 'Failed to update session');
    Sentry.captureException(error, {
      tags: { route: 'api:study-session', method: 'PATCH' },
    });
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}
