/**
 * Question generation job.
 * Async Inngest job for generating reading comprehension questions.
 */

import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/prisma";
import { step } from "inngest";
import { generateComprehensionQuestions } from "../services/question/question-generator";
import { GENERATE_QUESTIONS_EVENT, type GenerateQuestionsEventData } from "./events";

export const generateQuestionsJob = inngest.createFunction(
  {
    id: "generate-questions",
    name: "Generate Questions",
    triggers: [{ event: GENERATE_QUESTIONS_EVENT }],
  },
  async ({ event }: { event: { data: GenerateQuestionsEventData } }) => {
    const { passageId, userId, questionCount = 5 } = event.data;

    // Step 1: Get passage content
    const passage = await step.run("get-passage", async () => {
      return prisma.passage.findUnique({
        where: { id: passageId, userId },
        select: { id: true, content: true, title: true },
      });
    });

    if (!passage) {
      throw new Error("Passage not found");
    }

    // Step 2: Generate questions (AI call)
    const questionsResult = await step.run("generate-questions", async () => {
      // Idempotency: check if already generated
      const existing = await prisma.studioArtifact.findFirst({
        where: { passageId, userId, type: "question" },
        select: { id: true },
      });
      if (existing) {
        return { skip: true, artifactId: existing.id };
      }

      const questions = await generateComprehensionQuestions(
        passage.content,
        questionCount
      );

      if (!questions) {
        throw new Error("Question generation failed");
      }

      return { questions, passageId, userId, passageTitle: passage.title };
    });

    if ("skip" in questionsResult) {
      return { artifactId: questionsResult.artifactId, skipped: true };
    }

    // Step 3: Save to database
    const artifact = await step.run("save-to-db", async () => {
      const artifactId = crypto.randomUUID();

      await prisma.studioArtifact.create({
        data: {
          id: artifactId,
          passageId,
          userId,
          type: "question",
          title: `${passage.title} - Question`,
          status: "READY",
        },
      });

      if (questionsResult.questions.questions) {
        await prisma.question.createMany({
          data: questionsResult.questions.questions.map((q) => ({
            passageId,
            artifactId,
            questionText: q.questionText,
            options: JSON.stringify(q.options),
            correctOption: q.correctAnswer,
            sourceText: q.sourceText ?? "",
            sourceLine: q.sourceLine ?? 0,
            explanation: q.explanation ?? "",
          })),
        });
      }

      return { id: artifactId };
    });

    return { artifactId: artifact.id, questionCount };
  }
);
