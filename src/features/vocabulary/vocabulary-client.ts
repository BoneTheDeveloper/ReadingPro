"use client";

import * as Sentry from "@sentry/nextjs";
import { getUserId } from "@/services/clerk";
import {
  updateVocabularyStatusAction,
  deleteVocabularyItemAction,
  createVocabularySetAction,
  deleteVocabularySetAction,
} from "./actions";
import { getVocabularyItemList, getVocabularyItemStats } from "./services/vocabulary-items.service";
import { getVocabularySetList } from "./services/vocabulary-sets.service";
import type { VocabularyStatus, VocabularyItemDto, VocabularyStatsDto, VocabularySetDto } from "./schemas/vocabulary.schema";

function assertNoError(result: unknown, route: string): void {
  if (result && typeof result === "object" && "error" in result) {
    Sentry.addBreadcrumb({
      category: "vocabulary",
      level: "error",
      message: "vocabulary-request-error",
      data: { route },
    });
    throw new Error((result as { error: string }).error);
  }
}

/**
 * Fetch paginated vocabulary items with optional filtering.
 * NOTE: This will be migrated to Server Component in Phase 3.
 */
export async function getVocabularyList(params: {
  page: number;
  pageSize?: number;
  status?: VocabularyStatus | "ALL";
  search?: string;
  signal?: AbortSignal;
}): Promise<{ items: VocabularyItemDto[]; total: number }> {
  const userId = await getUserId();
  const { items, total } = await getVocabularyItemList({
    userId,
    page: params.page,
    pageSize: params.pageSize ?? 20,
    status: params.status,
    search: params.search,
  });
  return { items, total };
}

/**
 * Fetch all vocabulary sets.
 * NOTE: This will be migrated to Server Component in Phase 3.
 */
export async function getVocabularySets(): Promise<VocabularySetDto[]> {
  const userId = await getUserId();
  return getVocabularySetList({ userId });
}

/**
 * Fetch vocabulary progress stats for the current user.
 * NOTE: This will be migrated to Server Component in Phase 3.
 */
export async function getVocabularyStats(): Promise<VocabularyStatsDto> {
  const userId = await getUserId();
  return getVocabularyItemStats(userId);
}

/**
 * Update the review status of a vocabulary item.
 */
export async function updateVocabularyItemStatus(
  id: string,
  status: VocabularyStatus,
) {
  const result = await updateVocabularyStatusAction({
    itemId: id,
    status,
  });
  if (!result.success) {
    throw new Error("Failed to update status");
  }
  return result.data;
}

/**
 * Delete a saved vocabulary item.
 */
export async function deleteVocabularyItem(id: string) {
  const result = await deleteVocabularyItemAction(id);
  if (!result.success) {
    throw new Error("Failed to delete vocabulary item");
  }
}

/**
 * Create a manual vocabulary set.
 */
export async function createVocabularySet(name: string) {
  const result = await createVocabularySetAction({ name });
  if (!result.success) {
    throw new Error("Failed to create set");
  }
  return result.data;
}

/**
 * Delete a vocabulary set.
 */
export async function deleteVocabularySet(id: string) {
  const result = await deleteVocabularySetAction({ setId: id });
  if (!result.success) {
    throw new Error("Failed to delete set");
  }
}
