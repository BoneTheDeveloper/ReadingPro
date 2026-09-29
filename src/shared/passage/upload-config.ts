export const TEXT_INPUT_LIMITS = {
  MIN_LENGTH: 50,
  MAX_LENGTH: 100_000,
} as const;

export const FILE_LIMITS = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_MIME_TYPES: ["application/pdf", "text/plain"] as const,
  ALLOWED_EXTENSIONS: [".pdf", ".txt"] as const,
  MIN_FILE_SIZE: 1,
  MAX_FILENAME_LENGTH: 100,
} as const;
