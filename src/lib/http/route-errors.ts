import "server-only";
import { z } from "zod";
import { AuthenticationRequiredError } from "@/types/services/clerk";

export function isAuthenticationRequiredError(error: unknown) {
  return (
    error instanceof AuthenticationRequiredError ||
    (error instanceof Error && error.message === "Authentication required")
  );
}

export function getZodErrorMessage(
  error: z.ZodError,
  fallback = "Invalid request",
) {
  return error.issues[0]?.message ?? fallback;
}

export function isOwnershipMissError(error: unknown, resourceLabels: string[]) {
  if (error instanceof z.ZodError) {
    return error.issues.some((issue) =>
      isOwnershipMissMessage(issue.message, resourceLabels),
    );
  }

  return (
    error instanceof Error &&
    isOwnershipMissMessage(error.message, resourceLabels)
  );
}

function isOwnershipMissMessage(message: string, resourceLabels: string[]) {
  const normalized = message.toLowerCase();
  const matchesResource = resourceLabels.some((label) =>
    normalized.includes(label.toLowerCase()),
  );
  const isMissing =
    normalized.includes("not found") ||
    normalized.includes("not owned") ||
    (normalized.startsWith("no ") && normalized.includes(" found"));

  return matchesResource && isMissing;
}
