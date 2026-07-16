/**
 * Upload Configuration - Single Source of Truth
 * All upload-related constants and error messages are centralized here.
 * Client and Server share this config to ensure consistency.
 */

export const UPLOAD_CONFIG = {
  // File size limits
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_FILE_SIZE_MB: 10,

  // Allowed types
  ALLOWED_MIME_TYPES: ["application/pdf", "text/plain"] as const,
  ALLOWED_EXTENSIONS: [".pdf", ".txt"] as const,

  // Text content limits
  MIN_TEXT_LENGTH: 50,
  MAX_TEXT_LENGTH: 100000,

  // Filename limits
  MAX_FILENAME_LENGTH: 100,

  // Error messages (Single Source of Truth for all error text)
  ERROR_MESSAGES: {
    FILE_TOO_LARGE: "File exceeds the 10MB limit.",
    INVALID_TYPE: "Only PDF and plain text files are allowed.",
    EMPTY_FILE: "The uploaded file is empty.",
    CORRUPT_FILE: "File content does not match its extension.",
    TEXT_TOO_SHORT: "Text is too short (minimum 50 characters).",
    TEXT_TOO_LONG: "Text is too long (maximum 100,000 characters).",
    TEXT_EMPTY: "Text content is empty.",
    FILENAME_TOO_LONG: "Filename exceeds 100 character limit.",
    INVALID_FILENAME: "Invalid filename.",
  },
} as const;
