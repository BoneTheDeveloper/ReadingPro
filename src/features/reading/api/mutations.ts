"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/fetch-json";
import { TranslationOutputSchema } from "@/features/reading/schema";

export function useTranslateMutation() {
  return useMutation({
    mutationKey: ["translate"] as const,
    mutationFn: (input: { word: string; context: string }) =>
      fetchJson("/api/translate", TranslationOutputSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
  });
}
