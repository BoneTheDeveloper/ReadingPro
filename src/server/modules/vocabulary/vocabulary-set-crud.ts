import prisma, { isUniqueViolation } from "@/server/lib/prisma";
import { AppError } from "@/server/lib/errors";
import type { VocabularyStatus } from "@/shared/enums";
import {
  PRO_TIER,
  type VocabularySet,
  type VocabularySetGenerateInput,
} from "@/shared/vocabulary/set-schema";
import { toStatusCounts } from "./vocabulary-crud";
import { startOfDayInTimeZone } from "./fsrs-scheduler";

type SetRow = { id: string; name: string; createdAt: Date };

const SET_FIELDS = { id: true, name: true, createdAt: true } as const;

/** Adds each set's words (with their schedule), status counts, and last study date. */
async function withItems(userId: string, sets: SetRow[]): Promise<VocabularySet[]> {
  if (sets.length === 0) return [];
  const setIds = sets.map((s) => s.id);
  const inSets = { vocabularySetId: { in: setIds } };

  const [rows, sessions, profile] = await Promise.all([
    prisma.vocabularyItem.findMany({
      where: { userId, vocabularySetItems: { some: inSets } },
      orderBy: { createdAt: "desc" },
      include: { vocabularySetItems: { where: inSets, select: { vocabularySetId: true } } },
    }),
    prisma.reviewSession.groupBy({
      by: ["vocabularySetId"],
      // A session that was opened and left without a rating is not study.
      where: { userId, ...inSets, cardsReviewed: { gt: 0 } },
      _max: { startedAt: true },
    }),
    prisma.userProfile.findUnique({ where: { id: userId }, select: { timezone: true } }),
  ]);

  const today = startOfDayInTimeZone(new Date(), profile?.timezone ?? "UTC");

  const lastStudied = new Map(sessions.map((s) => [s.vocabularySetId, s._max.startedAt]));

  return sets.map((set) => {
    const items = rows
      .filter((row) => row.vocabularySetItems.some((link) => link.vocabularySetId === set.id))
      .map(({ vocabularySetItems: _links, ...item }) => item);

    const byStatus = new Map<VocabularyStatus, number>();
    for (const item of items) byStatus.set(item.status, (byStatus.get(item.status) ?? 0) + 1);

    const lastStudiedAt = lastStudied.get(set.id) ?? null;

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
  const sets = await prisma.vocabularySet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: SET_FIELDS,
  });
  return withItems(userId, sets);
}

export async function getVocabularySetForUser(userId: string, id: string): Promise<VocabularySet> {
  const set = await requireSetForUser(userId, id);
  return (await withItems(userId, [set]))[0];
}

export async function createVocabularySetForUser(
  userId: string,
  input: { name: string; itemIds: string[] },
): Promise<VocabularySet> {
  const itemIds = await requireItemsForUser(userId, input.itemIds);
  try {
    const set = await prisma.vocabularySet.create({
      data: {
        userId,
        name: input.name,
        vocabularySetItems: {
          createMany: { data: itemIds.map((vocabularyItemId) => ({ vocabularyItemId })) },
        },
      },
      select: SET_FIELDS,
    });
    return (await withItems(userId, [set]))[0];
  } catch (error) {
    if (isUniqueViolation(error)) throw nameTaken(input.name);
    throw error;
  }
}

/** A generated set is an ordinary set: due words first, then new words, up to `size`. */
export async function generateVocabularySetForUser(
  user: { id: string; tier?: string | null },
  input: VocabularySetGenerateInput,
): Promise<VocabularySet> {
  if (user.tier !== PRO_TIER) {
    throw new AppError("plan.pro_required", "Generating a set requires the Pro tier");
  }

  const due = await prisma.vocabularyItem.findMany({
    where: { userId: user.id, status: { not: "NEW" }, dueAt: { lte: new Date() } },
    orderBy: { dueAt: "asc" },
    take: input.size,
    select: { id: true },
  });
  const fresh =
    due.length < input.size
      ? await prisma.vocabularyItem.findMany({
          where: { userId: user.id, status: "NEW" },
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

export async function renameVocabularySetForUser(
  userId: string,
  id: string,
  name: string,
): Promise<VocabularySet> {
  await requireSetForUser(userId, id);
  try {
    const set = await prisma.vocabularySet.update({
      where: { id },
      data: { name },
      select: SET_FIELDS,
    });
    return (await withItems(userId, [set]))[0];
  } catch (error) {
    if (isUniqueViolation(error)) throw nameTaken(name);
    throw error;
  }
}

export async function deleteVocabularySetForUser(userId: string, id: string): Promise<void> {
  await requireSetForUser(userId, id);
  await prisma.vocabularySet.delete({ where: { id } });
}

export async function addVocabularySetItemsForUser(
  userId: string,
  id: string,
  itemIds: string[],
): Promise<void> {
  await requireSetForUser(userId, id);
  const owned = await requireItemsForUser(userId, itemIds);
  await prisma.vocabularySetItem.createMany({
    data: owned.map((vocabularyItemId) => ({ vocabularySetId: id, vocabularyItemId })),
    skipDuplicates: true,
  });
}

export async function removeVocabularySetItemForUser(
  userId: string,
  id: string,
  itemId: string,
): Promise<void> {
  await requireSetForUser(userId, id);
  await prisma.vocabularySetItem.deleteMany({
    where: { vocabularySetId: id, vocabularyItemId: itemId },
  });
}
