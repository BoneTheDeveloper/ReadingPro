"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/fetch-json";
import {
  VocabularyItemSchema,
  type VocabularyInput,
} from "@/features/vocabulary/schema";


export function useCreateVocabularyMutation() {
  return useMutation({
    mutationKey: ["vocabulary", "create"] as const,
    mutationFn: (input: VocabularyInput) =>
      fetchJson("/api/vocabulary", VocabularyItemSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
  });
}
