"use client";

import type {
  VocabularyStatus,
  VocabularyListResponse,
  VocabularySetsResponse,
} from "./model/vocabulary-types";

/**
 * Fetch paginated vocabulary items with optional filtering.
 */
export async function getVocabularyList(params: {
  page: number;
  pageSize?: number;
  status?: VocabularyStatus | "ALL";
  search?: string;
  signal?: AbortSignal;
}) {
  const queryParams = new URLSearchParams();
  queryParams.set("page", String(params.page));
  queryParams.set("pageSize", String(params.pageSize ?? 20));
  if (params.status && params.status !== "ALL") {
    queryParams.set("status", params.status);
  }
  if (params.search?.trim()) {
    queryParams.set("search", params.search.trim());
  }

  const res = await fetch(`/api/vocabulary/list?${queryParams}`, {
    signal: params.signal,
  });

  if (!res.ok) {
    throw new Error("Failed to load vocabulary");
  }

  const json: unknown = await res.json();
  return json as VocabularyListResponse;
}

/**
 * Fetch all vocabulary sets.
 */
export async function getVocabularySets() {
  const res = await fetch("/api/vocabulary/sets");

  if (!res.ok) {
    throw new Error("Failed to load vocabulary sets");
  }

  const json: unknown = await res.json();
  return json as VocabularySetsResponse;
}
