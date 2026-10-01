"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchJson, isApiError } from "@/client/lib/api/fetch-json";
import {
  ReviewRatingResponseSchema,
  ReviewSessionSchema,
  type ReviewRatingInput,
} from "@/shared/vocabulary/review-schema";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function useStartReviewSessionMutation() {
  return useMutation({
    mutationKey: ["vocabulary", "review", "start"] as const,
    mutationFn: (setId?: string) =>
      fetchJson("/api/review/sessions", ReviewSessionSchema, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ setId }),
      }),
  });
}

export function useRateCardMutation() {
  return useMutation({
    mutationKey: ["vocabulary", "review", "rate"] as const,
    // Safe to resend: the server applies each clientReviewId once.
    retry: (count, err) => count < 2 && !(isApiError(err) && err.status < 500),
    mutationFn: ({ sessionId, ...input }: ReviewRatingInput & { sessionId: string }) =>
      fetchJson(`/api/review/sessions/${sessionId}/ratings`, ReviewRatingResponseSchema, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(input),
      }),
  });
}

export function endReviewSession(sessionId: string) {
  return fetchJson(`/api/review/sessions/${sessionId}`, ReviewSessionSchema, {
    method: "PATCH",
    // Lets the request finish when it is sent while leaving the page.
    keepalive: true,
  });
}
