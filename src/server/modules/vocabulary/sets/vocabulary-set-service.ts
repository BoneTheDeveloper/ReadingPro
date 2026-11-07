import prisma, { isUniqueViolation } from "@/server/lib/prisma";
import { AppError } from "@/server/lib/errors";
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

type SetRow = {
  id: string;
  name: string;
  isDefault: boolean;
  dailyNewLimit: number;
  createdAt: Date;
};

const SET_FIELDS = {
  id: true,
  name: true,
  isDefault: true,
  dailyNewLimit: true,
  createdAt: true,
} as const;

/** Adds each set's words (with their schedule), status counts, and last study date. */
async function withItems(userId: string, sets: SetRow[]): Promise<VocabularySet[]> {
  if (sets.length === 0) return [];

  const [rows, profile] = await Promise.all([
    prisma.vocabularyItem.findMany({
      where: { userId, vocabularySetId: { in: sets.map((s) => s.id) } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userProfile.findUnique({ where: { id: userId }, select: { timezone: true } }),
  ]);

  const today = startOfDayInTimeZone(new Date(), profile?.timezone ?? "UTC");

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
  const set = await prisma.vocabularySet.findFirst({ where: { id, userId }, select: SET_FIELDS });
  if (!set) throw new AppError("vocabulary_set.not_found", "VocabularySet not found", { id });
  return set;
}

/** Rejects the whole request when any id is not one of the caller's words. */
async function requireItemsForUser(userId: string, itemIds: string[]): Promise<string[]> {
  const unique = [...new Set(itemIds)];
  if (unique.length === 0) return unique;
  const owned = await prisma.vocabularyItem.count({ where: { userId, id: { in: unique } } });
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
  const sets = await prisma.vocabularySet.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: SET_FIELDS,
  });
  return withItems(userId, sets);
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
    const set = await prisma.$transaction(async (tx) => {
      const created = await tx.vocabularySet.create({
        data: { userId, name: input.name },
        select: SET_FIELDS,
      });
      await tx.vocabularyItem.updateMany({
        where: { userId, id: { in: itemIds } },
        data: { vocabularySetId: created.id },
      });
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

  const unfiled = { userId: user.id, vocabularySetId: await ensureDefaultSetForUser(user.id) };

  const due = await prisma.vocabularyItem.findMany({
    where: { ...unfiled, status: { not: "NEW" }, dueAt: { lte: new Date() } },
    orderBy: { dueAt: "asc" },
    take: input.size,
    select: { id: true },
  });
  const fresh =
    due.length < input.size
      ? await prisma.vocabularyItem.findMany({
          where: { ...unfiled, status: "NEW" },
          orderBy: { createdAt: "asc" },
          take: input.size - due.length,
          select: { id: true },
        })
      : [];

  return createVocabularySetForUser(user.id, {
    name: input.name,
    itemIds: [...due, ...fresh].map((item) => item.id),
  });
}

export async function updateVocabularySetForUser(
  userId: string,
  id: string,
  input: VocabularySetUpdateInput,
): Promise<VocabularySet> {
  await requireSetForUser(userId, id);
  try {
    const set = await prisma.vocabularySet.update({
      where: { id },
      data: { name: input.name, dailyNewLimit: input.dailyNewLimit },
      select: SET_FIELDS,
    });
    return (await withItems(userId, [set]))[0];
  } catch (error) {
    if (isUniqueViolation(error)) throw nameTaken(input.name ?? "");
    throw error;
  }
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
  await prisma.$transaction([
    prisma.vocabularyItem.updateMany({
      where: { vocabularySetId: id },
      data: { vocabularySetId: defaultSetId },
    }),
    prisma.vocabularySet.delete({ where: { id } }),
  ]);
}

/** Moves the words into this set, out of the sets they were in. */
export async function addVocabularySetItemsForUser(
  userId: string,
  id: string,
  itemIds: string[],
): Promise<void> {
  await requireSetForUser(userId, id);
  const owned = await requireItemsForUser(userId, itemIds);
  await prisma.vocabularyItem.updateMany({
    where: { userId, id: { in: owned } },
    data: { vocabularySetId: id },
  });
}

/** Moves the word back to the default set; a word is never left without a set. */
export async function removeVocabularySetItemForUser(
  userId: string,
  id: string,
  itemId: string,
): Promise<void> {
  await requireSetForUser(userId, id);
  await prisma.vocabularyItem.updateMany({
    where: { userId, id: itemId, vocabularySetId: id },
    data: { vocabularySetId: await ensureDefaultSetForUser(userId) },
  });
}
