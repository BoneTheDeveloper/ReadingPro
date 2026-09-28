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

// Every user-facing failure message lives here — client and server both read
// from this file so the same condition never gets two different wordings.
// Components must not author their own strings.

export const TEXT_INPUT_ERRORS = {
  TOO_SHORT: "Văn bản quá ngắn tối thiểu 50 kí tự.",
  TOO_LONG: "Văn bản quá dài tối đa 100.000 kí tự.",
  EMPTY: "Văn bản trống.",
} as const;

export const YOUTUBE_ERRORS = {
  URL_INVALID: "YouTube URL không hợp lệ",
  NO_TRANSCRIPT: "Video không có phụ đề",
} as const;

export const FILE_ERRORS = {
  FILE_TOO_LARGE: "File vượt quá giới hạn 10MB.",
  INVALID_TYPE: "Chỉ hỗ trợ file PDF và văn bản thuần.",
  EMPTY_FILE: "File rỗng, vui lòng chọn file khác.",
  CORRUPT_FILE: "Nội dung file không khớp với phần mở rộng.",
  FILENAME_TOO_LONG: "Tên file vượt quá 100 kí tự.",
  INVALID_FILENAME: "Tên file không hợp lệ.",
  INVALID_FALLBACK: "File không hợp lệ, vui lòng thử lại.",
} as const;

export const UPLOAD_ERRORS = {
  FAILED: "Tải lên thất bại",
} as const;
