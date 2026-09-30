import { queryOptions } from "@tanstack/react-query";
import { fetchJson } from "@/client/lib/api/fetch-json";
import {
  VocabularyListResponseSchema,
  VocabularyStatsSchema,
} from "@/shared/vocabulary/schema";
import {
  VocabularySetDetailSchema,
  VocabularySetListResponseSchema,
} from "@/shared/vocabulary/set-schema";
import { ReviewDueResponseSchema } from "@/shared/vocabulary/review-schema";

// Sets and review keys sit under "vocabulary": a change to a word, a set, or a
// schedule moves the counts on all three, so one invalidation refreshes them.
export const vocabularyQueries = {
  all: () => ["vocabulary"] as const,

  list: () =>
    queryOptions({
      queryKey: [...vocabularyQueries.all(), "list"] as const,
      queryFn: ({ signal }) =>
        fetchJson("/api/vocabulary", VocabularyListResponseSchema, { signal }),
    }),

  stats: () =>
    queryOptions({
      queryKey: [...vocabularyQueries.all(), "stats"] as const,
      queryFn: ({ signal }) =>
        fetchJson("/api/vocabulary/stats", VocabularyStatsSchema, { signal }),
    }),
};

export const vocabularySetQueries = {
  list: () =>
    queryOptions({
      queryKey: [...vocabularyQueries.all(), "sets", "list"] as const,
      queryFn: ({ signal }) =>
        fetchJson("/api/vocabulary-set", VocabularySetListResponseSchema, { signal }),
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: [...vocabularyQueries.all(), "sets", "detail", id] as const,
      queryFn: ({ signal }) =>
        fetchJson(`/api/vocabulary-set/${id}`, VocabularySetDetailSchema, { signal }),
    }),
};

export const reviewQueries = {
  due: (setId?: string) =>
    queryOptions({
      queryKey: [...vocabularyQueries.all(), "review", "due", setId ?? null] as const,
      // Due-ness depends on the clock, so a cached answer is never trusted.
      staleTime: 0,
      queryFn: ({ signal }) =>
        fetchJson(
          setId ? `/api/review/due?setId=${setId}` : "/api/review/due",
          ReviewDueResponseSchema,
          { signal },
        ),
    }),
};
