'use server';

import { NextRequest, NextResponse } from 'next/server';
import { analyzeContentAction } from '@/app/actions/analyze';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.isText && body.text) {
      const formData = new FormData();
      formData.set('text', body.text);
      formData.set('title', body.title || 'Untitled');
      
      const result = await analyzeContentAction(formData);
      return NextResponse.json({ success: true, data: result });
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Text processing error:', error);
    return NextResponse.json({ error: 'Failed to process text' }, { status: 500 });
  }
}