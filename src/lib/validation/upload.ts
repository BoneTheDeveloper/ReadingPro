export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_TEXT_TYPES = ['text/plain'];
export const ALLOWED_PDF_TYPES = ['application/pdf'];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    };
  }

  if (file.type === 'application/pdf' || file.type === 'text/plain') {
    return { valid: true };
  }

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