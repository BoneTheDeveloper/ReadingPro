"use client";

import * as Sentry from "@sentry/nextjs";
import { patchJson, deleteJson, postJson } from "@/lib/http/api-request";
import {
  vocabularyListResponseSchema,
  vocabularySetsResponseSchema,
  vocabularyItemResponseSchema,
  vocabularySetResponseSchema,
  vocabularyStatsResponseSchema,
  vocabularyAckResponseSchema,
  type VocabularyStatus,
} from "@/features/vocabulary/schemas/vocabulary.schema";

function assertNoError<T>(
  result: T,
  route: string,
  fallbackMessage: string,
): asserts result is T & Record<string, unknown> {
  if (result && typeof result === "object" && "error" in result && typeof (result as { error: unknown }).error === "string") {
    Sentry.addBreadcrumb({
      category: "vocabulary",
      level: "error",
      message: "vocabulary-request-error",
      data: { route },
    });
    throw new Error((result as { error: string }).error ?? fallbackMessage);
  }
}

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

  const route = `/api/vocabulary/list?${queryParams}`;
  const res = await fetch(route, { signal: params.signal });
  const json: unknown = await res.json();
  const parsed = vocabularyListResponseSchema.safeParse(json);

  if (!parsed.success) {
    Sentry.addBreadcrumb({
      category: "vocabulary",
      level: "error",
      message: "vocabulary-list-schema-error",
      data: { route },
    });
    throw new Error("Failed to load vocabulary");
  }

  assertNoError(parsed.data, route, "Failed to load vocabulary");
  return parsed.data;
}

/**
 * Fetch all vocabulary sets.
 */
export async function getVocabularySets() {
  const route = "/api/vocabulary/sets";
  const res = await fetch(route);
  const json: unknown = await res.json();
  const parsed = vocabularySetsResponseSchema.safeParse(json);

  if (!parsed.success) {
    Sentry.addBreadcrumb({
      category: "vocabulary",
      level: "error",
      message: "vocabulary-sets-schema-error",
      data: { route },
    });
    throw new Error("Failed to load vocabulary sets");
  }

  assertNoError(parsed.data, route, "Failed to load vocabulary sets");
  return parsed.data;
}

/**
 * Fetch vocabulary progress stats for the current user.
 */
export async function getVocabularyStats() {
  const route = "/api/vocabulary/stats";
  const res = await fetch(route);
  const json: unknown = await res.json();
  const parsed = vocabularyStatsResponseSchema.safeParse(json);

  if (!parsed.success) {
    Sentry.addBreadcrumb({
      category: "vocabulary",
      level: "error",
      message: "vocabulary-stats-schema-error",
      data: { route },
    });
    throw new Error("Failed to load vocabulary stats");
  }

  assertNoError(parsed.data, route, "Failed to load vocabulary stats");
  return parsed.data;
}

/**
 * Update the review status of a vocabulary item.
 */
export async function updateVocabularyItemStatus(
  id: string,
  status: VocabularyStatus,
) {
  const result = await patchJson(
    `/api/vocabulary/${id}/status`,
    { status },
    vocabularyItemResponseSchema,
  );
  assertNoError(
    result,
    `/api/vocabulary/${id}/status`,
    "Failed to update status",
  );
  return result;
}

/**
 * Delete a saved vocabulary item.
 */
export async function deleteVocabularyItem(id: string) {
  const result = await deleteJson(
    `/api/vocabulary/${id}`,
    vocabularyAckResponseSchema,
  );
  assertNoError(
    result,
    `/api/vocabulary/${id}`,
    "Failed to delete vocabulary item",
  );
}

/**
 * Create a manual vocabulary set.
 */
export async function createVocabularySet(name: string) {
  const result = await postJson(
    "/api/vocabulary/sets",
    { name },
    vocabularySetResponseSchema,
  );
  assertNoError(result, "/api/vocabulary/sets", "Failed to create set");
  return result;
}

/**
 * Delete a vocabulary set.
 */
export async function deleteVocabularySet(id: string) {
  const result = await deleteJson(
    `/api/vocabulary/sets/${id}`,
    vocabularyAckResponseSchema,
  );
  assertNoError(result, `/api/vocabulary/sets/${id}`, "Failed to delete set");
}
