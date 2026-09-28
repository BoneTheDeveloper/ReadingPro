import { ERROR_CODES, type ApiErrorBody, type ErrorCode } from "@/shared/contracts/api-error";

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


export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    super(404, ERROR_CODES.NOT_FOUND, `${entity} not found`, id ? { id } : undefined);
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
