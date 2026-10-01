import prisma from "@/server/lib/prisma";

const DEFAULT_SET_NAME = "Mặc định";

/**
 * Id of the set that holds the words the user has not filed anywhere else.
 * Created on first use; the user may rename it but not delete it.
 */
export async function ensureDefaultSetForUser(userId: string): Promise<string> {
  const existing = await prisma.vocabularySet.findFirst({
    where: { userId, isDefault: true },
    select: { id: true },
  });
  if (existing) return existing.id;

  return prisma.$transaction(async (tx) => {
    // Profile row lock: two first requests must not each create a default set.
    await tx.$queryRaw`SELECT "id" FROM "UserProfile" WHERE "id" = ${userId} FOR UPDATE`;
    const created = await tx.vocabularySet.findFirst({
      where: { userId, isDefault: true },
      select: { id: true },
    });
    if (created) return created.id;

    // A set the user already named like the default becomes the default.
    const set = await tx.vocabularySet.upsert({
      where: { userId_name: { userId, name: DEFAULT_SET_NAME } },
      create: { userId, name: DEFAULT_SET_NAME, isDefault: true },
      update: { isDefault: true },
      select: { id: true },
    });
    return set.id;
  });
}
