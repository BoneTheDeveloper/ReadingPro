import { queryOptions } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/fetch-json";
import {
  VocabularyListResponseSchema,
  VocabularyStatsSchema,
} from "@/features/vocabulary/schema";

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