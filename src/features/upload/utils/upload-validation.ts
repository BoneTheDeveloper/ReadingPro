/**
 * Upload Validation - Single Source of Truth for validation logic
 * Client (UX) and Server (Security) both use these functions.
 */

import { UPLOAD_CONFIG } from "./upload-config";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

// ============ FILE VALIDATION ============

/**
 * Shallow file validation - used by Client for fast UX feedback
 * Checks: size, MIME type, extension
 */
export function validateFile(file: File): FileValidationResult {
  if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: UPLOAD_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: UPLOAD_CONFIG.ERROR_MESSAGES.EMPTY_FILE,
    };
  }

  // Check MIME type
  const mimeType = file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();

  // Accept if MIME or extension matches
  const validMime = UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(mimeType as typeof UPLOAD_CONFIG.ALLOWED_MIME_TYPES[number]);
  const validExtension =
    extension === "pdf" || extension === "txt";

  if (!validMime && !validExtension) {
    return {
      valid: false,
      error: UPLOAD_CONFIG.ERROR_MESSAGES.INVALID_TYPE,
    };
  }

  return { valid: true };
}

/**
 * Deep file validation - Server-side only
 * Verifies actual file content using magic numbers (file signatures)
 * This prevents attacks where someone renames malware.exe to document.pdf
 */
export async function validateFileContent(
  buffer: Buffer,
  mimeType: string
): Promise<FileValidationResult> {
  if (mimeType === "application/pdf") {
    // Verify PDF magic number: %PDF- (starts with 0x25 0x50 0x44 0x46)
    // file-type library handles this robustly
    const { fileTypeFromBuffer } = await import("file-type");
    const detected = await fileTypeFromBuffer(buffer);

    if (!detected) {
      return {
        valid: false,
        error: UPLOAD_CONFIG.ERROR_MESSAGES.CORRUPT_FILE,
      };
    }

    // Check if detected type is PDF (or matches expected MIME)
    if (detected.mime !== "application/pdf") {
      return {
        valid: false,
        error: UPLOAD_CONFIG.ERROR_MESSAGES.CORRUPT_FILE,
      };
    }

    return { valid: true };
  }

  if (mimeType === "text/plain" || mimeType === "text/plain;charset=utf-8") {
    // Verify it's valid UTF-8 text (no null bytes, valid encoding)
    const textDecoder = new TextDecoder("utf-8", { fatal: true });
    try {
      textDecoder.decode(buffer);

      // Check for null bytes which indicate binary data
      if (buffer.includes(0x00)) {
        return {
          valid: false,
          error: UPLOAD_CONFIG.ERROR_MESSAGES.CORRUPT_FILE,
        };
      }

      return { valid: true };
    } catch {
      return {
        valid: false,
        error: UPLOAD_CONFIG.ERROR_MESSAGES.CORRUPT_FILE,
      };
    }
  }

  // Unknown type - fail safe
  return {
    valid: false,
    error: UPLOAD_CONFIG.ERROR_MESSAGES.INVALID_TYPE,
  };
}

// ============ TEXT VALIDATION ============

/**
 * Text content validation - used by both Client and Server
 */
export function validateTextContent(text: string): FileValidationResult {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return {
      valid: false,
      error: UPLOAD_CONFIG.ERROR_MESSAGES.TEXT_EMPTY,
    };
  }

  if (trimmed.length < UPLOAD_CONFIG.MIN_TEXT_LENGTH) {
    return {
      valid: false,
      error: UPLOAD_CONFIG.ERROR_MESSAGES.TEXT_TOO_SHORT,
    };
  }

  if (trimmed.length > UPLOAD_CONFIG.MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: UPLOAD_CONFIG.ERROR_MESSAGES.TEXT_TOO_LONG,
    };
  }

  return { valid: true };
}
