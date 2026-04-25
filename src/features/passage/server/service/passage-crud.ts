import "server-only";
import prisma from "@/lib/prisma";
import type {
  Passage,
  PassageListItem,
} from "@/features/passage/schema";
import { CEFRLevel, SourceType } from "@/generated/prisma/enums";

export async function findPassageForUser(
  userId: string,
  id: string,
): Promise<Passage | null> {
  return prisma.passage.findFirst({
    where: { id, userId },
  });
}

export async function listPassagesForUser(
  userId: string,
): Promise<PassageListItem[]> {
  return prisma.passage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      sourceType: true,
      createdAt: true,
    },
  });
}

export async function deletePassageForUser(userId: string, id: string) {
  return prisma.passage.delete({
    where: { id, userId },
  });
}

export async function createPassageForUser(args: {
  userId: string;
  title: string;
  content: string;
  sourceType: SourceType
  cefrLevel?: CEFRLevel
  youtubeUrl?: string | null;
}): Promise<Passage> {
  const wordCount = args.content.split(/\s+/).filter(Boolean).length;

  return prisma.passage.create({
    data: {
      userId: args.userId,
      title: args.title.slice(0, 200),
      content: args.content,
      cefrLevel: args.cefrLevel ,
      wordCount,
      sourceType: args.sourceType,
      filePath: null,
      youtubeUrl: args.sourceType === "YOUTUBE" ? args.youtubeUrl ?? null : null,
    },
  });
}
