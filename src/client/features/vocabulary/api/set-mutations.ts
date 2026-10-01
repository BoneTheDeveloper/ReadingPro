"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { fetchJson } from "@/client/lib/api/fetch-json";
import {
  VocabularySetSchema,
  type VocabularySetCreateInput,
  type VocabularySetGenerateInput,
  type VocabularySetUpdateInput,
} from "@/shared/vocabulary/set-schema";
import { vocabularyQueries } from "./queries";

const JSON_HEADERS = { "Content-Type": "application/json" };

function useInvalidateVocabulary() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: vocabularyQueries.all() });
}

export function useCreateVocabularySetMutation() {
  return useMutation({
    mutationKey: ["vocabulary", "sets", "create"] as const,
    mutationFn: (input: VocabularySetCreateInput) =>
      fetchJson("/api/vocabulary-set", VocabularySetSchema, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(input),
      }),
    onSuccess: useInvalidateVocabulary(),
  });
}

export function useGenerateVocabularySetMutation() {
  return useMutation({
    mutationKey: ["vocabulary", "sets", "generate"] as const,
    mutationFn: (input: VocabularySetGenerateInput) =>
      fetchJson("/api/vocabulary-set/generate", VocabularySetSchema, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(input),
      }),
    onSuccess: useInvalidateVocabulary(),
  });
}

export function useUpdateVocabularySetMutation() {
  return useMutation({
    mutationKey: ["vocabulary", "sets", "update"] as const,
    mutationFn: ({ id, ...input }: { id: string } & VocabularySetUpdateInput) =>
      fetchJson(`/api/vocabulary-set/${id}`, VocabularySetSchema, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(input),
      }),
    onSuccess: useInvalidateVocabulary(),
  });
}

export function useDeleteVocabularySetMutation() {
  return useMutation({
    mutationKey: ["vocabulary", "sets", "delete"] as const,
    mutationFn: (id: string) =>
      fetchJson(`/api/vocabulary-set/${id}`, z.void(), { method: "DELETE" }),
    onSuccess: useInvalidateVocabulary(),
  });
}

export function useAddVocabularySetItemsMutation() {
  return useMutation({
    mutationKey: ["vocabulary", "sets", "add-items"] as const,
    mutationFn: ({ id, itemIds }: { id: string; itemIds: string[] }) =>
      fetchJson(`/api/vocabulary-set/${id}/items`, z.void(), {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({ itemIds }),
      }),
    onSuccess: useInvalidateVocabulary(),
  });
}

export function useRemoveVocabularySetItemMutation() {
  return useMutation({
    mutationKey: ["vocabulary", "sets", "remove-item"] as const,
    mutationFn: ({ id, itemId }: { id: string; itemId: string }) =>
      fetchJson(`/api/vocabulary-set/${id}/items/${itemId}`, z.void(), { method: "DELETE" }),
    onSuccess: useInvalidateVocabulary(),
  });
}
