import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { parsePDF } from '@/lib/pdf-parser';

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

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${safeName}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    let text: string;
    let metadata: Record<string, unknown> = {};

    if (file.type === 'application/pdf') {
      const pdf = await parsePDF(buffer);
      text = pdf.text;
      metadata = {
        pages: pdf.pages,
        title: pdf.metadata?.title,
      };
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

    return NextResponse.json({
      success: true,
      data: {
        filename,
        originalName: file.name,
        filetype: file.type,
        size: file.size,
        text,
        wordCount,
        metadata,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    );
  }
}