"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { fetchJson } from "@/lib/api/fetch-json";
import {
  VocabularyItemSchema,
  VocabularyUpdateInputSchema,
  type VocabularyInput,
  type VocabularyItem,
  type VocabularyUpdateInput,
} from "@/features/vocabulary/schema";
import { vocabularyQueries } from "@/features/vocabulary/api/queries";

export function useCreateVocabularyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["vocabulary", "create"] as const,
    mutationFn: (input: VocabularyInput) =>
      fetchJson("/api/vocabulary", VocabularyItemSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: vocabularyQueries.all() }),
  });
}

export function useUpdateVocabularyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["vocabulary", "update"] as const,
    mutationFn: ({ id, ...input }: { id: string } & VocabularyUpdateInput) =>
      fetchJson(`/api/vocabulary/${id}`, VocabularyItemSchema, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VocabularyUpdateInputSchema.parse(input)),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: vocabularyQueries.all() }),
  });
}
export function useDeleteVocabularyMutation() {
  const queryClient = useQueryClient();
  const listKey = vocabularyQueries.list().queryKey;

  return useMutation({
    mutationKey: ["vocabulary", "delete"] as const,
    mutationFn: (id: string) =>
      fetchJson(`/api/vocabulary/${id}`, z.void(), { method: "DELETE" }),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: listKey });

      const previous = queryClient.getQueryData<VocabularyItem[]>(listKey);

      queryClient.setQueryData<VocabularyItem[]>(listKey, (old) =>
        old?.filter((v) => v.id !== id),
      );

      return { previous };
    },

    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(listKey, ctx.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: vocabularyQueries.all() });
    },
  });
}
