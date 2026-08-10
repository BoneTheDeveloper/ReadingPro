import { keepPreviousData, queryOptions, skipToken } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/fetch-json";
import { passageSchema, passageListSchema } from "@/features/passage/schema";

export const passageQueries = {
  all: () => ["passages"] as const,

  list: () =>
    queryOptions({
      queryKey: [...passageQueries.all(), "list"] as const,
      queryFn: ({ signal }) => fetchJson("/api/passage", passageListSchema, { signal }),
      // The list is the single polling loop while work is still in flight.
      // It drives PENDING → COMPLETED/FAILED transitions that happen in the
      // background (AI processing); detail is reactive only and rides the
      // shared cache. Poll on PENDING only — COMPLETED and FAILED are terminal.
      refetchInterval: (query) =>
        (query.state.data ?? []).some((p) => p.status === "PENDING") ? 2000 : false,
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
    }),
};
