"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { fetchJson } from "@/client/lib/api/fetch-json";
import type { WordLookup } from "@/shared/dictionary/schema";
import { wordLookupQueries } from "./queries";

export function useDeleteLookupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lookupId, passageId }: { lookupId: string; passageId: string }) => {
      await fetchJson(`/api/word-lookup/${lookupId}`, z.void(), { method: "DELETE" });
      return { lookupId, passageId };
    },
    onSuccess: ({ lookupId, passageId }) => {
      queryClient.setQueryData(wordLookupQueries.list(passageId).queryKey, (old: WordLookup[] | undefined) =>
        old?.filter((row) => row.id !== lookupId),
      );
      queryClient.removeQueries({ queryKey: wordLookupQueries.detail(lookupId).queryKey });
      // A cached lookup would otherwise skip the request that records the word again.
      queryClient.removeQueries({ queryKey: [...wordLookupQueries.all(), "lookUp", passageId] });
    },
  });
}
