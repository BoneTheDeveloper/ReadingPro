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
      status: true,
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
  sourceType: SourceType;
  cefrLevel?: CEFRLevel;
  youtubeUrl?: string | null;
}): Promise<Passage> {

  return prisma.passage.create({
    data: {
      userId: args.userId,
      cefrLevel: args.cefrLevel,
      sourceType: args.sourceType,
      filePath: null,
      youtubeUrl: args.sourceType === "YOUTUBE" ? args.youtubeUrl ?? null : null,
      status:  "PENDING",
    },
  });
}

export async function completePassageProcessing(args: {
  userId: string;
  passageId: string;
  content: string;
  title: string;
  cefrLevel: CEFRLevel | null;
}): Promise<Passage> {
  const wordCount = args.content.split(/\s+/).filter(Boolean).length;

  return prisma.passage.update({
    where: { id: args.passageId, userId: args.userId },
    data: {
      title: args.title.slice(0, 200),
      content: args.content,
      cefrLevel: args.cefrLevel,
      wordCount,
      status: "COMPLETED",
    },
  });
}

/**
 * Terminal failure state for background processing. Keeps the row — and the
 * user's uploaded content — so the failure is visible and deletable, instead
 * of vanishing silently.
 */
export async function failPassageProcessing(args: {
  userId: string;
  passageId: string;
}): Promise<Passage> {
  return prisma.passage.update({
    where: { id: args.passageId, userId: args.userId },
    data: { status: "FAILED" },
  });
}
