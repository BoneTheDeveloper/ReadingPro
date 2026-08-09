"use client";

import { useQuery } from "@tanstack/react-query";
import {
  vocabularyListSchema,
  type VocabularyItem,
} from "@/features/vocabulary/schema";
import { vocabularyKeys } from "./query-keys";

/* ─── Fetchers ─────────────────────────────────────────────────────── */

async function fetchVocabularyItems(
  signal?: AbortSignal,
): Promise<VocabularyItem[]> {
  const res = await fetch("/api/vocabulary", { signal });
  if (!res.ok) throw new Error("Không tải được danh sách từ vựng");
  return vocabularyListSchema.parse(await res.json());
}

/* ─── Query hooks ──────────────────────────────────────────────────── */

export function useVocabularyItems() {
  return useQuery({
    queryKey: vocabularyKeys.list(),
    queryFn: ({ signal }) => fetchVocabularyItems(signal),
  });
}
