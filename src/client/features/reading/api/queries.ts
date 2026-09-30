import { queryOptions } from "@tanstack/react-query";
import { fetchJson } from "@/client/lib/api/fetch-json";
import { TranslationOutputSchema } from "@/shared/reading/schema";

export const readingQueries = {
  /**
   * Cached for the browser session: the same word in the same sentence is
   * translated once. Nothing is stored on the server.
   */
  translate: (word: string, context: string) =>
    queryOptions({
      queryKey: ["translate", word, context] as const,
      // The translation popup renders the error inline.
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
