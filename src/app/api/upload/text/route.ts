import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { validateTextContent } from '@/lib/validation/upload';
import { analyzeContentAction } from '@/app/actions/analyze';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('api:upload:text');

export async function POST(request: NextRequest) {
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

    const formData = new FormData();
    formData.set('text', body.text);
    formData.set('title', body.title || 'Untitled');

    const result = await analyzeContentAction(formData);

    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    log.error({ err: error }, 'Text processing failed');
    Sentry.captureException(error, {
      tags: { route: 'api:upload:text', method: 'POST' },
    });
    return NextResponse.json(
      { error: 'Failed to process text' },
      { status: 500 }
    );
  }
}
