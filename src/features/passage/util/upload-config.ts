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

export const TEXT_INPUT_ERRORS = {
  TOO_SHORT: "Văn bản quá ngắn tối thiểu 50 kí tự.",
  TOO_LONG: "Văn bản quá dài tối đa 100.000 kí tự.",
  EMPTY: "Text content is empty.",
} as const;

export const YOUTUBE_ERRORS = {
  URL_INVALID: "YouTube URL không hợp lệ",
  NO_TRANSCRIPT: "Video không có phụ đề",
} as const;

export const FILE_ERRORS = {
  FILE_TOO_LARGE: "File exceeds the 10MB limit.",
  INVALID_TYPE: "Only PDF and plain text files are allowed.",
  EMPTY_FILE: "The uploaded file is empty.",
  CORRUPT_FILE: "File content does not match its extension.",
  FILENAME_TOO_LONG: "Filename exceeds 100 character limit.",
  INVALID_FILENAME: "Invalid filename.",
} as const;
