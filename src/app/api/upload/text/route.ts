import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { validateTextContent } from '@/shared/upload/upload-validation';
import { getAuthenticatedUser } from '@/server/auth/auth-utils';
import { isAuthenticationRequiredError } from '@/server/http/route-errors';
import { createRequestLogContext, createRequestLogger } from '@/server/core/logger';
import { analyzeAndPersistContent } from '@/server/modules/upload/content-analysis/content-analysis.service';

const textUploadSchema = z.object({
  text: z.string().min(1),
  title: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const requestLog = createRequestLogger(
    'api:upload:text',
    createRequestLogContext(request, 'POST', '/api/upload/text'),
  );

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const parsed = textUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    const validation = validateTextContent(parsed.data.text);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    const result = await analyzeAndPersistContent({
      userId: user.id,
      text: parsed.data.text,
      title: parsed.data.title || 'Untitled',
      sourceType: 'TEXT',
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

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
