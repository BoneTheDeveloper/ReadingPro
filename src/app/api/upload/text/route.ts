import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { validateTextContent } from '@/lib/validation/upload';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { createModuleLogger } from '@/lib/core/logger';
import { analyzeAndPersistContent } from '@/features/upload/content-analysis-service';

const log = createModuleLogger('api:upload:text');

export async function POST(request: NextRequest) {
  const context = {
    requestId: request.headers.get('x-request-id') ?? request.headers.get('x-vercel-id') ?? undefined,
    path: request.nextUrl.pathname,
    method: 'POST',
  };

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
    log.error({ err: error, context }, 'Text processing failed');
    Sentry.captureException(error, {
      tags: { route: 'api:upload:text', method: 'POST' },
    });
    return NextResponse.json(
      { error: 'Failed to process text' },
      { status: 500 }
    );
  }
}
