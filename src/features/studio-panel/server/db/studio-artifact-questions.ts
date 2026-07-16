import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { QuestionType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";



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
  questions: {
    questionText: string;
    options: Prisma.InputJsonValue;
    correctOption: string;
    sourceText: string;
    sourceLine: number;
    explanation: string;
    questionType: QuestionType;
    difficulty: number;
  }[];
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
      data: input.questions.map((q) => ({
        passageId: input.passageId,
        artifactId: input.artifactId,
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        sourceText: q.sourceText,
        sourceLine: q.sourceLine,
        explanation: q.explanation,
        questionType: q.questionType,
        difficulty: q.difficulty,
      })),
    });
    return { artifact };
  });
}
