import { isUniqueViolation, withTransaction } from "@/server/lib/db";
import { AppError } from "@/server/lib/errors";
import { findUserSettings } from "@/server/modules/user-settings";
import type { VocabularyStatus } from "@/shared/enums";
import {
  PRO_TIER,
  type VocabularySet,
  type VocabularySetGenerateInput,
  type VocabularySetUpdateInput,
} from "@/shared/vocabulary/set-schema";
import { toStatusCounts } from "../status-counts";
import { ensureDefaultSetForUser } from "../default-vocabulary-set";
import { startOfDayInTimeZone } from "../fsrs-scheduler";
import {
  countOwnedItems,
  createSet,
  deleteSet,
  findSetForUser,
  listDueItemIdsInSet,
  listItemsInSets,
  listNewItemIdsInSet,
  listSetsForUser,
  moveItemsBetweenSets,
  moveItemsToSet,
  updateSet,
  type SetRow,
} from "./vocabulary-set-repository";

/** Adds each set's words (with their schedule), status counts, and last study date. */
async function withItems(userId: string, sets: SetRow[]): Promise<VocabularySet[]> {
  if (sets.length === 0) return [];

  const [rows, settings] = await Promise.all([
    listItemsInSets(userId, sets.map((s) => s.id)),
    findUserSettings(userId),
  ]);

  const today = startOfDayInTimeZone(new Date(), settings?.timezone ?? "UTC");

  return sets.map((set) => {
    const items = rows.filter((row) => row.vocabularySetId === set.id);

    const byStatus = new Map<VocabularyStatus, number>();
    let lastStudiedAt: Date | null = null;
    for (const item of items) {
      byStatus.set(item.status, (byStatus.get(item.status) ?? 0) + 1);
      if (item.lastReviewAt && (!lastStudiedAt || item.lastReviewAt > lastStudiedAt)) {
        lastStudiedAt = item.lastReviewAt;
      }
    }

    return {
      ...set,
      lastStudiedAt,
      studiedToday: lastStudiedAt !== null && lastStudiedAt >= today,
      itemCount: items.length,
      progress: toStatusCounts([...byStatus].map(([status, count]) => ({ status, count }))),
      items,
    };
  });
}

async function requireSetForUser(userId: string, id: string): Promise<SetRow> {
  const set = await findSetForUser(userId, id);
  if (!set) throw new AppError("vocabulary_set.not_found", "VocabularySet not found", { id });
  return set;
}

/** Rejects the whole request when any id is not one of the caller's words. */
async function requireItemsForUser(userId: string, itemIds: string[]): Promise<string[]> {
  const unique = [...new Set(itemIds)];
  if (unique.length === 0) return unique;
  const owned = await countOwnedItems(userId, unique);
  if (owned !== unique.length) {
    throw new AppError("vocabulary.not_found", "VocabularyItem not found", { itemIds: unique });
  }
  return unique;
}

function nameTaken(name: string) {
  return new AppError("vocabulary_set.name_taken", "A set with this name already exists", { name });
}

export async function listVocabularySetsForUser(userId: string): Promise<VocabularySet[]> {
  // The default set always exists, so it is listed even before the first save.
  await ensureDefaultSetForUser(userId);
  return withItems(userId, await listSetsForUser(userId));
}

export async function getVocabularySetForUser(userId: string, id: string): Promise<VocabularySet> {
  const set = await requireSetForUser(userId, id);
  return (await withItems(userId, [set]))[0];
}

/** Creates a set and moves the given words into it, out of the sets they were in. */
export async function createVocabularySetForUser(
  userId: string,
  input: { name: string; itemIds: string[] },
): Promise<VocabularySet> {
  const itemIds = await requireItemsForUser(userId, input.itemIds);
  try {
    const set = await withTransaction(async (tx) => {
      const created = await createSet(userId, input.name, tx);
      await moveItemsToSet(userId, itemIds, created.id, tx);
      return created;
    });
    return (await withItems(userId, [set]))[0];
  } catch (error) {
    if (isUniqueViolation(error)) throw nameTaken(input.name);
    throw error;
  }
}

/**
 * A generated set is an ordinary set filled from the default set: due words
 * first, then new words, up to `size`. Words the user filed elsewhere stay put.
 */
export async function generateVocabularySetForUser(
  user: { id: string; tier?: string | null },
  input: VocabularySetGenerateInput,
): Promise<VocabularySet> {
  if (user.tier !== PRO_TIER) {
    throw new AppError("plan.pro_required", "Generating a set requires the Pro tier");
  }

  const defaultSetId = await ensureDefaultSetForUser(user.id);

  const due = await listDueItemIdsInSet(user.id, defaultSetId, new Date(), input.size);
  const fresh =
    due.length < input.size
      ? await listNewItemIdsInSet(user.id, defaultSetId, input.size - due.length)
      : [];

  return createVocabularySetForUser(user.id, { name: input.name, itemIds: [...due, ...fresh] });
}

export async function updateVocabularySetForUser(
  userId: string,
  id: string,
  input: VocabularySetUpdateInput,
): Promise<VocabularySet> {
  let set: SetRow | null;
  try {
    set = await updateSet(userId, id, { name: input.name, dailyNewLimit: input.dailyNewLimit });
  } catch (error) {
    if (isUniqueViolation(error)) throw nameTaken(input.name ?? "");
    throw error;
  }
  if (!set) throw new AppError("vocabulary_set.not_found", "VocabularySet not found", { id });
  return (await withItems(userId, [set]))[0];
}

/** Deleting a set keeps its words: they go back to the default set. */
export async function deleteVocabularySetForUser(userId: string, id: string): Promise<void> {
  const set = await requireSetForUser(userId, id);
  if (set.isDefault) {
    throw new AppError("vocabulary_set.default_protected", "The default set cannot be deleted", {
      id,
    });
  }
  const defaultSetId = await ensureDefaultSetForUser(userId);
  await withTransaction(async (tx) => {
    await moveItemsBetweenSets(userId, id, defaultSetId, undefined, tx);
    const deleted = await deleteSet(userId, id, tx);
    if (!deleted) throw new AppError("vocabulary_set.not_found", "VocabularySet not found", { id });
  });
}

/** Moves the words into this set, out of the sets they were in. */
export async function addVocabularySetItemsForUser(
  userId: string,
  id: string,
  itemIds: string[],
): Promise<void> {
  await requireSetForUser(userId, id);
  const owned = await requireItemsForUser(userId, itemIds);
  await moveItemsToSet(userId, owned, id);
}

/** Moves the word back to the default set; a word is never left without a set. */
export async function removeVocabularySetItemForUser(
  userId: string,
  id: string,
  itemId: string,
): Promise<void> {
  await requireSetForUser(userId, id);
  await moveItemsBetweenSets(userId, id, await ensureDefaultSetForUser(userId), itemId);
}
