import prisma, { isUniqueViolation } from "@/server/lib/prisma";
import { AppError } from "@/server/lib/errors";
import type { VocabularyStatus } from "@/shared/enums";
import type { VocabularyStatusCounts } from "@/shared/vocabulary/schema";
import {
  PRO_TIER,
  type VocabularySet,
  type VocabularySetDetail,
  type VocabularySetGenerateInput,
} from "@/shared/vocabulary/set-schema";
import { toStatusCounts } from "./vocabulary-crud";

type SetRow = { id: string; name: string; createdAt: Date };

const SET_FIELDS = { id: true, name: true, createdAt: true } as const;

/** Member counts per status for each set, in one grouped query. */
async function loadProgress(setIds: string[]): Promise<Map<string, VocabularyStatusCounts>> {
  if (setIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<
    Array<{ vocabularySetId: string; status: VocabularyStatus; count: number }>
  >`
    SELECT si."vocabularySetId", vi."status", COUNT(*)::int AS count
    FROM "VocabularySetItem" si
    JOIN "VocabularyItem" vi ON vi."id" = si."vocabularyItemId"
    WHERE si."vocabularySetId" = ANY(${setIds}::uuid[])
    GROUP BY si."vocabularySetId", vi."status"
  `;

  const bySet = new Map<string, Array<{ status: VocabularyStatus; count: number }>>();
  for (const row of rows) {
    const groups = bySet.get(row.vocabularySetId) ?? [];
    groups.push(row);
    bySet.set(row.vocabularySetId, groups);
  }
  return new Map([...bySet].map(([id, groups]) => [id, toStatusCounts(groups)]));
}

async function withProgress(sets: SetRow[]): Promise<VocabularySet[]> {
  const progress = await loadProgress(sets.map((s) => s.id));
  return sets.map((set) => {
    const counts = progress.get(set.id) ?? toStatusCounts([]);
    return {
      ...set,
      progress: counts,
      itemCount: counts.new + counts.learning + counts.review + counts.relearning,
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
  return withProgress(sets);
}

export async function getVocabularySetForUser(
  userId: string,
  id: string,
): Promise<VocabularySetDetail> {
  const set = await requireSetForUser(userId, id);
  const [[summary], items] = await Promise.all([
    withProgress([set]),
    prisma.vocabularyItem.findMany({
      where: { userId, vocabularySetItems: { some: { vocabularySetId: id } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { ...summary, items };
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
    return (await withProgress([set]))[0];
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
    return (await withProgress([set]))[0];
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
