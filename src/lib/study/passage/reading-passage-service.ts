import { db } from "@/lib/db/client";
import type { ReadingPassageData } from "@/lib/study/shared/reading-passage-types";

export async function getReadingPassageForUser(
  userId: string,
  passageId: string,
): Promise<ReadingPassageData | null> {
  const passage = await db.passage.findUnique({
    where: { id: passageId, userId, deletedAt: null },
    include: { questions: true },
  });

  if (!passage) return null;

  const displayContent = passage.simplifiedContent || passage.content;
  const displayLevel = passage.simplifiedLevel || passage.originalLevel || "B2";

  return {
    id: passage.id,
    title: passage.title,
    content: passage.content,
    simplifiedContent: passage.simplifiedContent,
    originalLevel: passage.originalLevel,
    simplifiedLevel: passage.simplifiedLevel,
    wordCount: passage.wordCount,
    displayContent,
    displayLevel,
    questionCount: passage.questions.length,
  };
}
