import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { validateTextContent } from '@/lib/validation/upload';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { createRequestLogContext, createRequestLogger } from '@/lib/core/logger';
import { analyzeAndPersistContent } from '@/features/upload/content-analysis-service';

export async function POST(request: NextRequest) {
  const requestLog = createRequestLogger(
    'api:upload:text',
    createRequestLogContext(request, 'POST', '/api/upload/text'),
  );

  try {
    const body = await request.json();

    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'Text content is required' },
        { status: 400 }
      );
    }

    const validation = validateTextContent(body.text);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    const result = await analyzeAndPersistContent({
      userId: user.id,
      text: body.text,
      title: body.title || 'Untitled',
      sourceType: 'TEXT',
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    requestLog.error({ err: error }, 'Text processing failed');
    Sentry.captureException(error, {
      tags: { route: 'api:upload:text', method: 'POST' },
    });
    return NextResponse.json(
      { error: 'Failed to process text' },
      { status: 500 }
    );
  }
}
