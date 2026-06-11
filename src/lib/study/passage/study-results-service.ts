import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db/client";
import type { StudioResult } from "@/features/study/study-types";

export interface StudyResultsData {
  results: StudioResult[];
}

export async function fetchStudyResults(
  userId: string,
  passageId: string,
): Promise<StudyResultsData> {
  const passage = await Sentry.startSpan(
    { name: "db:passage-fetch", op: "db" },
    async () =>
      db.passage.findFirst({
        where: { id: passageId, userId, deletedAt: null },
        select: { id: true, simplifiedContent: true, updatedAt: true },
      }),
  );

  if (!passage) return { results: [] };

  const results: StudioResult[] = [];

  const question = await Sentry.startSpan(
    { name: "db:question-exists-check", op: "db" },
    async () =>
      db.question.findFirst({
        where: { passageId },
        select: { createdAt: true },
      }),
  );

  if (question) {
    results.push({
      id: `quiz:${passageId}`,
      type: "quiz",
      passageId,
      title: "Quiz",
      status: "completed",
      createdAt: question.createdAt.toISOString(),
    });
  }

  if (passage.simplifiedContent != null) {
    results.push({
      id: `summary:${passageId}`,
      type: "summary",
      passageId,
      title: "Summary",
      status: "completed",
      createdAt: passage.updatedAt.toISOString(),
    });
  }

  return { results };
}
