'use client';

import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { validateFile, formatFileSize } from '@/lib/upload-validator';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing?: boolean;
  disabled?: boolean;
}

export function UploadZone({ onFileSelect, isProcessing, disabled }: UploadZoneProps) {
  const [error, setError] = useState<string>();

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
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
    maxSize: 10 * 1024 * 1024,
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
          <div
            className={cn(
              'w-16 h-16 rounded-xl flex items-center justify-center transition-transform',
              isDragActive ? 'bg-primary-200 scale-110' : 'bg-primary-100'
            )}
          >
            {isProcessing ? (
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-primary-600" />
            )}
          </div>

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

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}