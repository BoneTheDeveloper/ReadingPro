import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { questionDataSchema } from "@/features/studio-panel/schemas/question.schema";

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

export async function getPassageWithQuestions(
  passageId: string,
  userId: string,
) {
  return prisma.passage.findUnique({
    where: { id: passageId, userId, deletedAt: null },
    include: { questions: true },
  });
}

export async function createQuestion(data: {
  passageId: string;
  artifactId: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctOption: string;
  sourceText: string;
  sourceLine: number;
  explanation: string;
}) {
  const result = questionDataSchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Invalid question data: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }
  return prisma.question.create({
    data: data as unknown as Prisma.QuestionUncheckedCreateInput,
  });
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
  return prisma.$transaction(async (tx) => {
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
  });
}
