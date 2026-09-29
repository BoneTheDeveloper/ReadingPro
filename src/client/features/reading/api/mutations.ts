"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchJson } from "@/client/lib/api/fetch-json";
import { TranslationOutputSchema } from "@/shared/reading/schema";

export function useTranslateMutation() {
  return useMutation({
    mutationKey: ["translate"] as const,
    // The translation popup renders the error inline.
    meta: { silent: true },
    mutationFn: (input: { word: string; context: string }) =>
      fetchJson("/api/translate", TranslationOutputSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
  });
}
