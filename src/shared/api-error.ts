const ERROR_CODES = {
  VALIDATION: "VALIDATION",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Every specific failure the API can report. `code` is the broad category the
 * client branches on (e.g. UNAUTHORIZED → sign in again); the reason itself is
 * the key the client translates. The server never sends user-facing text.
 */
export const ERROR_REASONS = {
  "request.invalid": { status: 400, code: ERROR_CODES.VALIDATION },
  "auth.required": { status: 401, code: ERROR_CODES.UNAUTHORIZED },
  "passage.not_found": { status: 404, code: ERROR_CODES.NOT_FOUND },
  "passage.not_ready": { status: 404, code: ERROR_CODES.NOT_FOUND },
  "artifact.not_found": { status: 404, code: ERROR_CODES.NOT_FOUND },
  "vocabulary.not_found": { status: 404, code: ERROR_CODES.NOT_FOUND },
  "youtube.url_invalid": { status: 400, code: ERROR_CODES.VALIDATION },
  "youtube.no_transcript": { status: 400, code: ERROR_CODES.VALIDATION },
  "chat.invalid_request": { status: 400, code: ERROR_CODES.VALIDATION },
  "internal": { status: 500, code: ERROR_CODES.INTERNAL },
} as const satisfies Record<string, { status: number; code: ErrorCode }>;

export type ErrorReason = keyof typeof ERROR_REASONS;

export type ApiErrorBody = {
  error: {
    code: ErrorCode;
    reason: ErrorReason;
    /** English, for developers and logs. Never shown to users. */
    message: string;
    details?: unknown;
  };
};
