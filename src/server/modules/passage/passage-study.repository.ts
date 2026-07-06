import "server-only";
import * as Sentry from "@sentry/nextjs";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/lib/db";

export interface QuestionCreateInput {
  questionText: string;
  options: Prisma.InputJsonValue;
  correctOption: string;
  sourceText: string;
  sourceLine: number;
  explanation: string;
  questionType: Prisma.QuestionCreateManyInput["questionType"];
  difficulty: number;
}

export async function findExistingStudioArtifact(
  artifactId: string,
  userId: string,
) {
  return prisma.studioArtifact.findUnique({
    where: { id: artifactId, userId },
    include: { quizResult: true, questions: { orderBy: { createdAt: "asc" } } },
  });
}

export async function createStudioArtifactWithQuestions(input: {
  artifactId: string;
  passageId: string;
  userId: string;
  title: string;
  questions: QuestionCreateInput[];
}) {
  return Sentry.startSpan(
    { name: "db:artifact-and-questions-create", op: "db" },
    () =>
      prisma.$transaction(async (tx) => {
        const artifact = await tx.studioArtifact.create({
          data: {
            id: input.artifactId,
            passageId: input.passageId,
            userId: input.userId,
            type: "quiz",
            title: input.title,
            status: "done",
          },
          include: { quizResult: true },
        });
        await tx.question.createMany({
          data: input.questions.map((question) => ({
            passageId: input.passageId,
            artifactId: input.artifactId,
            ...question,
          })),
        });
        return { artifact };
      }),
  );
}

export async function findOwnedPassage(userId: string, passageId: string) {
  return Sentry.startSpan({ name: "db:passage-fetch", op: "db" }, async () => {
    return prisma.passage.findUnique({
      where: { id: passageId, userId, deletedAt: null },
    });
  });
}
