export const ERROR_CODES = {
  VALIDATION: "VALIDATION",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type ApiErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
};

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  get isExpected(): boolean {
    return this.statusCode < 500;
  }

  toBody(): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== undefined && { details: this.details }),
      },
    };
  }

  toResponse(): Response {
    return Response.json(this.toBody(), { status: this.statusCode });
  }
}


export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, ERROR_CODES.UNAUTHORIZED, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource") {
    super(403, ERROR_CODES.FORBIDDEN, message);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    super(404, ERROR_CODES.NOT_FOUND, `${entity} not found`, id ? { id } : undefined);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(409, ERROR_CODES.CONFLICT, message, details);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = "Too many requests") {
    super(429, ERROR_CODES.RATE_LIMITED, message);
  }
}

export class InternalError extends AppError {
  constructor(message: string, details?: unknown) {
    super(500, ERROR_CODES.INTERNAL, message, details);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
export function internalErrorBody(): ApiErrorBody {
  return {
    error: { code: ERROR_CODES.INTERNAL, message: "Internal server error" },
  };
}
