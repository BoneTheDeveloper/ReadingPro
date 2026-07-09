import { AppError } from "./base.error";

/**
 * Thrown when input validation fails (e.g., ZodError).
 * toHttp maps this to HTTP 400.
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
