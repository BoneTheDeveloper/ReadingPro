import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const questionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const questionDataSchema = z
  .object({
    artifactId: z
      .string()
      .regex(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        "Invalid UUID",
      ),
    questionText: z.string(),
    options: z.array(questionOptionSchema).min(2),
    correctOption: z.string(),
    sourceText: z.string(),
    sourceLine: z.number().int().positive(),
    explanation: z.string(),
  })
  .refine((q) => q.options.some((opt) => opt.id === q.correctOption), {
    message: "correctOption must match one of the option ids",
    path: ["correctOption"],
  });

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

export async function getNewCards(userId: string, passageId: string) {
  return prisma.question.findMany({
    where: {
      passageId,
      reviews: {
        none: { userId },
      },
    },
    take: 5,
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
