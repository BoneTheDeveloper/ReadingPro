"use client";

import { useMutation } from "@tanstack/react-query";
import {
  VocabularyInputSchema,
  type VocabularyInput,
} from "@/features/vocabulary/schema";

/**
 * Save a vocabulary item. Used by the inline-translation popup's "Lưu"
 * button in the reading feature.
 *
 * The response shape mirrors the Prisma row. We don't re-validate on the
 * client because the server is the source of truth and re-parsing would
 * require duplicating the Prisma column list here.
 */
async function createVocabulary(input: VocabularyInput): Promise<unknown> {
  const res = await fetch("/api/vocabulary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Không lưu được từ vựng");
  return res.json();
}

export function useCreateVocabularyMutation() {
  return useMutation({
    mutationKey: ["vocabulary", "create"] as const,
    mutationFn: (input: VocabularyInput) =>
      createVocabulary(VocabularyInputSchema.parse(input)),
  });
}