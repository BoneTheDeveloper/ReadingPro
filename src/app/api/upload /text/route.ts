import { NextRequest, NextResponse } from 'next/server';
import { validateTextContent } from '@/lib/upload-validator';
import { analyzeContentAction } from '@/app/actions/analyze';

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
    console.error('Text processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process text' },
      { status: 500 }
    );
  }
}
