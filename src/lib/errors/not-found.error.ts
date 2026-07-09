import { AppError } from "./base.error";

/**
 * Thrown when a requested resource is not found.
 * toHttp maps this to HTTP 404.
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found.`);
    this.name = "NotFoundError";
  }
}
