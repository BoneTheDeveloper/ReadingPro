import { AppError } from "@/lib/errors";

/**
 * Chat service specific errors.
 * Note: NotFoundError should be used for "not found" cases - this is for
 * chat-specific errors that don't map to standard HTTP codes.
 */
export class StudyChatServiceError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = "StudyChatServiceError";
  }
}
