import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { parsePDF } from '@/lib/parsers/pdf';
import { validateFile } from '@/lib/validation/upload';
import { analyzeContentAction } from '@/app/actions/analyze';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('api:upload');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'content');

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureUploadDir();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${timestamp}-${safeName}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    let text: string;

    if (file.type === 'application/pdf') {
      const pdf = await parsePDF(buffer);
      text = pdf.text;
    } else {
      text = buffer.toString('utf-8');
    }

    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 50) {
      return NextResponse.json(
        { error: 'Extracted text is too short (minimum 50 words)' },
        { status: 400 }
      );
    }

    const title = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

    const analyzeFormData = new FormData();
    analyzeFormData.set('text', text);
    analyzeFormData.set('title', title);

    const result = await analyzeContentAction(analyzeFormData);

    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        filename,
        passageId: result.passageId,
        originalLevel: result.originalLevel,
        simplifiedLevel: result.simplifiedLevel,
        questionCount: result.questionCount,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Upload failed');
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    );
  }
}
