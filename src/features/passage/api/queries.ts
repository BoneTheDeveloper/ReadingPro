import { keepPreviousData, queryOptions, skipToken } from "@tanstack/react-query";
import { fetchJson, isApiError } from "@/lib/api/fetch-json";
import { passageSchema, passageListSchema } from "@/features/passage/schema";

export const passageQueries = {
  all: () => ["passages"] as const,

  list: () =>
    queryOptions({
      queryKey: [...passageQueries.all(), "list"] as const,
      queryFn: ({ signal }) => fetchJson("/api/passage", passageListSchema, { signal }),
      // The list is the single polling loop while any row is non-terminal.
      // It drives PENDING → COMPLETED transitions that happen in the background
      // (AI processing); detail is reactive only and rides the shared cache.
      refetchInterval: (query) =>
        (query.state.data ?? []).some((p) => p.status !== "COMPLETED") ? 2000 : false,
    }),

  detail: (passageId: string | null) =>
    queryOptions({
      queryKey: [...passageQueries.all(), "detail", passageId ?? ""] as const,
      queryFn:
        passageId === null
          ? skipToken
          : ({ signal }) =>
              fetchJson(`/api/passage/${passageId}`, passageSchema, { signal }),
      placeholderData: keepPreviousData,
      retry: (failureCount, error) =>
        isApiError(error) && error.status === 404 ? false : failureCount < 3,
    }),
};
