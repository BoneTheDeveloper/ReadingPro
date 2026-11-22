import { queryOptions, skipToken } from "@tanstack/react-query";
import { fetchJson } from "@/client/lib/api/fetch-json";
import { getQueryClient } from "@/client/lib/query-client";
import {
  WordLookupListResponseSchema,
  WordLookupResultSchema,
  type WordLookupResult,
} from "@/shared/dictionary/schema";
import { TranslationOutputSchema } from "@/shared/reading/schema";

export const wordLookupQueries = {
  all: () => ["word-lookup"] as const,

  /** The passage's "Từ đã tra" rows, newest first. */
  list: (passageId: string | null) =>
    queryOptions({
      queryKey: [...wordLookupQueries.all(), "list", passageId ?? ""] as const,
      queryFn:
        passageId === null
          ? skipToken
          : ({ signal }) =>
              fetchJson(`/api/word-lookup?passageId=${passageId}`, WordLookupListResponseSchema, { signal }),
    }),

  /** A stored row with its entries resolved again. */
  detail: (lookupId: string | null) =>
    queryOptions({
      queryKey: [...wordLookupQueries.all(), "detail", lookupId ?? ""] as const,
      queryFn:
        lookupId === null
          ? skipToken
          : ({ signal }) => fetchJson(`/api/word-lookup/${lookupId}`, WordLookupResultSchema, { signal }),
    }),

  /**
   * Looks a selected word up and records it in the passage's history. It is a
   * query rather than a mutation because the POST is an idempotent upsert: the
   * Pro popup and the Studio view share one cached result, so "Xem chi tiết"
   * sends no second request. A `dictionary.not_found` error is rendered inline.
   */
  lookUp: (passageId: string, word: string, context: string | null) =>
    queryOptions({
      queryKey: [...wordLookupQueries.all(), "lookUp", passageId, word, context ?? ""] as const,
      meta: { silent: true },
      retry: false,
      // No abort signal: a write is not worth cancelling, and a cancelled
      // request would be sent again when the view remounts.
      queryFn: async (): Promise<WordLookupResult> => {
        const result = await fetchJson("/api/word-lookup", WordLookupResultSchema, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passageId, word, ...(context ? { context } : {}) }),
        });
        const queryClient = getQueryClient();
        queryClient.setQueryData(wordLookupQueries.detail(result.lookup.id).queryKey, result);
        void queryClient.invalidateQueries({ queryKey: wordLookupQueries.list(passageId).queryKey });
        return result;
      },
    }),
};

export const translateQueries = {
  /**
   * The AI meaning in context (Pro only). Cached for the browser session: the
   * same word in the same sentence is translated once.
   */
  inContext: (word: string, context: string) =>
    queryOptions({
      queryKey: ["translate", word, context] as const,
      meta: { silent: true },
      staleTime: Infinity,
      gcTime: Infinity,
      retry: false,
      queryFn: ({ signal }) =>
        fetchJson("/api/translate", TranslationOutputSchema, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word, context }),
          signal,
        }),
    }),
};
