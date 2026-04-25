---
title: "Phase 03: File Upload Handling"
description: "Implement drag-drop file upload for text and PDF files with client-side validation and server-side processing"
status: pending
priority: P1
effort: 6h
branch: main
tags: [upload, pdf, text-processing, forms]
created: 2026-04-20
---

# Phase 03: File Upload Handling

**Status:** pending
**Owner:** unassigned
**Dependencies:** Phase 01

---

## Overview

Build user interface for content upload with drag-drop support, file validation, progress indication, and server-side processing.

---

## Requirements

### Functional
- Drag-and-drop file upload zone
- Support for `.txt` and `.pdf` files
- Client-side file validation (size, type)
- Upload progress indication
- Text paste input alternative
- Server-side file storage (local filesystem)
- PDF text extraction using pdf-parse

### Non-Functional
- 10MB maximum file size
- Responsive design (mobile/desktop)
- Accessible keyboard navigation
- Loading states with feedback
- Error handling for invalid files

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Upload View Component                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Upload Zone (Drag & Drop)          │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │          File Icon + Instructions            │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │              [Choose File] [Browse]                 │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Or Paste Text Directly                 │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │           Text Area                          │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Processing Spinner                      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    Server Action Handler                     │
│  1. Validate file (size, type)                              │
│  2. Save to filesystem (/uploads)                           │
│  3. Extract text (pdf-parse for PDF)                        │
│  4. Return content metadata                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Related Code Files

### Files to Create
- `src/app/(dashboard)/upload/page.tsx` - Upload view
- `src/components/upload-zone.tsx` - Drop zone component
- `src/components/text-input-area.tsx` - Text paste alternative
- `src/app/api/upload/route.ts` - Upload API endpoint
- `src/lib/upload-validator.ts` - File validation utilities
- `src/lib/pdf-parser.ts` - PDF text extraction

### Files to Modify
- `src/app/globals.css` - Upload zone animations
- `src/lib/utils.ts` - File-related utilities

---

## Implementation Steps

### 1. Create Upload Validator Utilities

**File:** `src/lib/upload-validator.ts`

```typescript
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_TEXT_TYPES = ['text/plain'];
export const ALLOWED_PDF_TYPES = ['application/pdf'];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    };
  }

  // Check file type
  if (file.type === 'application/pdf') {
    return { valid: true };
  }

  if (file.type === 'text/plain') {
    return { valid: true };
  }

  // Check extension as fallback
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf' || extension === 'txt') {
    return { valid: true };
  }

  return {
    valid: false,
    error: 'Only .txt and .pdf files are supported',
  };
}

export function validateTextContent(text: string): FileValidationResult {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Text content is empty' };
  }

  if (trimmed.length < 50) {
    return { valid: false, error: 'Text is too short (minimum 50 characters)' };
  }

  if (trimmed.length > 100000) {
    return { valid: false, error: 'Text is too long (maximum 100,000 characters)' };
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
```

### 2. Create PDF Parser Utility

**File:** `src/lib/pdf-parser.ts`

```typescript
import pdf from 'pdf-parse';

export interface ParsedPDF {
  text: string;
  pages: number;
  metadata?: {
    title?: string;
    author?: string;
    creationDate?: Date;
  };
}

export async function parsePDF(buffer: Buffer): Promise<ParsedPDF> {
  try {
    const data = await pdf(buffer);

    // Clean up common PDF extraction issues
    const cleanedText = data.text
      .replace(/\f/g, '\n\n') // Form feed to double newline
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join('\n');

    return {
      text: cleanedText.trim(),
      pages: data.numpages,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        creationDate: data.info?.CreationDate,
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function extractTitleFromPDF(pdf: ParsedPDF, filename: string): string {
  if (pdf.metadata?.title) {
    return pdf.metadata.title;
  }

  // Try to extract first line as title
  const firstLine = pdf.text.split('\n')[0];
  if (firstLine && firstLine.length < 100 && firstLine.length > 3) {
    return firstLine;
  }

  // Fallback to filename
  return filename.replace('.pdf', '').replace(/[_-]/g, ' ');
}
```

### 3. Create Upload Zone Component

**File:** `src/components/upload-zone.tsx`

```typescript
'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { validateFile, formatFileSize } from '@/lib/upload-validator';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing?: boolean;
  disabled?: boolean;
}

export function UploadZone({ onFileSelect, isProcessing, disabled }: UploadZoneProps) {
  const [error, setError] = useState<string>();
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(undefined);

      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === 'file-too-large') {
          setError('File size exceeds 10MB limit');
        } else if (rejection.errors[0]?.code === 'file-invalid-type') {
          setError('Only .txt and .pdf files are supported');
        } else {
          setError('Invalid file. Please try again.');
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const validation = validateFile(acceptedFiles[0]);
        if (!validation.valid) {
          setError(validation.error);
          return;
        }
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    disabled: disabled || isProcessing,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center',
          'border-2 border-dashed rounded-2xl p-12 text-center',
          'transition-all duration-200 cursor-pointer',
          'min-h-[300px]',
          isDragActive && 'border-primary-500 bg-primary-50 scale-[1.02]',
          !isDragActive && 'border-neutral-300 hover:border-primary-400 hover:bg-neutral-50',
          (disabled || isProcessing) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-6">
          {/* Icon */}
          <div
            className={cn(
              'w-16 h-16 rounded-xl flex items-center justify-center transition-transform',
              isDragActive ? 'bg-primary-200 scale-110' : 'bg-primary-100'
            )}
          >
            {isProcessing ? (
              <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
            ) : (
              <Upload className="w-8 h-8 text-primary-600" />
            )}
          </div>

          {/* Text */}
          <div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">
              {isDragActive ? 'Drop your file here' : isProcessing ? 'Processing...' : 'Upload your content'}
            </h3>
            <p className="text-neutral-500 text-sm">
              {isProcessing
                ? 'Please wait while we process your file'
                : 'Drag and drop, or click to browse'}
            </p>
          </div>

          {/* Info */}
          {!isProcessing && (
            <div className="flex items-center gap-4 text-sm text-neutral-500">
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                .txt, .pdf
              </span>
              <span>•</span>
              <span>Max {formatFileSize(10 * 1024 * 1024)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-lg flex items-center gap-2 text-error-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
```

### 4. Create Text Input Component

**File:** `src/components/text-input-area.tsx`

```typescript
'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateTextContent } from '@/lib/upload-validator';

interface TextInputAreaProps {
  onSubmit: (text: string) => void;
  isProcessing?: boolean;
  disabled?: boolean;
}

export function TextInputArea({ onSubmit, isProcessing, disabled }: TextInputAreaProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();

  const handleSubmit = () => {
    const validation = validateTextContent(text);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    setError(undefined);
    onSubmit(text);
  };

  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div className="w-full">
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-neutral-200 bg-neutral-50">
          <FileText className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-neutral-900">Paste Your Text</h3>
        </div>

        {/* Text Area */}
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(undefined);
          }}
          disabled={disabled || isProcessing}
          placeholder="Paste your English text content here..."
          className={cn(
            'w-full p-6 min-h-[300px] resize-none focus:outline-none',
            'font-serif text-lg leading-relaxed text-neutral-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        />

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-neutral-200 bg-neutral-50">
          <span className="text-sm text-neutral-500">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>

          <button
            onClick={handleSubmit}
            disabled={disabled || isProcessing || text.trim().length === 0}
            className={cn(
              'px-6 py-2.5 rounded-lg font-medium transition-all',
              'bg-primary-600 text-white hover:bg-primary-700',
              'disabled:bg-neutral-300 disabled:cursor-not-allowed'
            )}
          >
            {isProcessing ? 'Processing...' : 'Continue'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-lg flex items-center gap-2 text-error-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
```

### 5. Create Upload API Route

**File:** `src/app/api/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { parsePDF } from '@/lib/pdf-parser';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'content');

// Ensure upload directory exists
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

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${safeName}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Extract text content
    let text: string;
    let metadata: any = {};

    if (file.type === 'application/pdf') {
      const pdf = await parsePDF(buffer);
      text = pdf.text;
      metadata = {
        pages: pdf.pages,
        title: pdf.metadata?.title,
      };
    } else {
      // Text file
      text = buffer.toString('utf-8');
    }

    // Validate extracted text
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
```

### 6. Create Upload Page

**File:** `src/app/(dashboard)/upload/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadZone } from '@/components/upload-zone';
import { TextInputArea } from '@/components/text-input-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function UploadPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'text'>('file');

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();

      // Navigate to processing with content
      router.push(`/processing?filename=${result.data.filename}`);
    } catch (error) {
      console.error('Upload error:', error);
      // Show error toast (implement in Phase 04)
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async (text: string) => {
    setIsProcessing(true);

    try {
      const response = await fetch('/api/upload/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Processing failed');
      }

      const result = await response.json();
      router.push(`/processing?contentId=${result.data.id}`);
    } catch (error) {
      console.error('Text processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-neutral-900">Upload Content</h1>
          <p className="text-neutral-500">Add reading material for AI-powered analysis</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <Tabs
          value={uploadMethod}
          onValueChange={(v) => setUploadMethod(v as 'file' | 'text')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="file">Upload File</TabsTrigger>
            <TabsTrigger value="text">Paste Text</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="mt-0">
            <UploadZone
              onFileSelect={handleFileUpload}
              isProcessing={isProcessing}
              disabled={isProcessing}
            />
          </TabsContent>

          <TabsContent value="text" className="mt-0">
            <TextInputArea
              onSubmit={handleTextSubmit}
              isProcessing={isProcessing}
              disabled={isProcessing}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
```

### 7. Add react-dropzone Dependency

```bash
npm install react-dropzone
```

---

## Todo List

- [ ] Create upload validator utilities
- [ ] Create PDF parser utility
- [ ] Create upload zone component with drag-drop
- [ ] Create text input area component
- [ ] Create upload API route
- [ ] Create upload page with tabs
- [ ] Add error handling and loading states
- [ ] Test with various file types and sizes

---

## Success Criteria

1. ✅ Drag-drop uploads work for .txt and .pdf files
2. ✅ File size validation (10MB limit) works correctly
3. ✅ PDF text extraction produces readable content
4. ✅ Progress indication during upload
5. ✅ Text paste alternative works smoothly
6. ✅ Error messages display for invalid inputs
7. ✅ Responsive design matches wireframes

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| PDF extraction fails | Medium | Show extraction warnings, allow manual text entry |
| Large file timeout | Medium | Implement streaming upload with progress chunks |
| Malicious file uploads | Low | Validate file types, sanitize content |

---

## Next Steps

After completion:
- Proceed to [Phase 04: Gemini Integration](phase-04-gemini-integration.md)

---

## Context Links

- [Upload Wireframe](../../docs/wireframe/landing-upload.html)
- [pdf-parse Documentation](https://www.npmjs.com/package/pdf-parse)
- [react-dropzone Documentation](https://react-dropzone.js.org)
