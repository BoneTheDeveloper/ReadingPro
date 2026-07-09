/**
 * Base error class for operational errors (business logic).
 * isOperational = true distinguishes business errors from unexpected system errors.
 *
 * Rule: lib/errors/ must NOT import from lib/http/, @sentry/nextjs, or any HTTP-specific module.
 * These errors represent domain concepts only.
 */
export class AppError extends Error {
  readonly isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}
