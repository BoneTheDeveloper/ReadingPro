import { AppError } from "./base.error";

/**
 * Thrown when a resource conflict occurs (e.g., duplicate key).
 * toHttp maps this to HTTP 409.
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
