import { AppError } from "./base.error";

/**
 * Thrown when authentication is required but missing or invalid.
 * toHttp maps this to HTTP 401.
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}
