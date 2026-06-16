import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getAuthenticatedUser } from '@/server/auth/auth-utils';
import { getZodErrorMessage, isAuthenticationRequiredError } from '@/server/http/route-errors';
import { createRequestLogContext, createRequestLogger } from '@/server/core/logger';
import { ensureActiveSession } from '@/server/db/study-session-queries';
import { toStudySessionDto } from '@/shared/study/study-response-schema';

const studySessionPostSchema = z.object({}).strict();

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

    const user = await getAuthenticatedUser();

    const session = await Sentry.startSpan({ name: 'db:session-ensure-active', op: 'db' }, async () => {
      return ensureActiveSession(user.id);
    });

    return NextResponse.json({ success: true, data: toStudySessionDto(session) });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodErrorMessage(error) }, { status: 400 });
    }
    requestLog.error({ err: error }, 'Failed to ensure active session');
    Sentry.captureException(error, {
      tags: { route: 'api:study-session', method: 'POST' },
    });
    return NextResponse.json(
      { error: 'Failed to ensure active session' },
      { status: 500 }
    );
  }
}
