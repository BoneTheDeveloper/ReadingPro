import * as Sentry from '@sentry/nextjs';
import { generateComprehensionQuestions, type GeneratedQuestion } from '@/lib/ai/question-generator';
import { simplifyContent } from '@/lib/ai/content-simplifier';
import { createModuleLogger } from '@/lib/core/logger';
import { db } from '@/lib/db/client';
import { questionDataSchema } from '@/lib/db/passage-queries';
import { getTargetCEFRLevel, isSimplifiableCEFRLevel, type CEFRLevel } from '@/lib/domain/cefr';
import type { QuestionData } from '@/features/study/study-types';

const log = createModuleLogger('features:study:passage-service');

export type SimplifyPassageResult =
  | { simplifiedContent: string; simplifiedLevel: CEFRLevel }
  | { skipped: true; reason: string };

export async function simplifyPassageForUser(userId: string, passageId: string): Promise<SimplifyPassageResult> {
  const passage = await getOwnedPassage(userId, passageId);
  const originalLevel = passage.originalLevel as CEFRLevel | null;

  if (!originalLevel || !isSimplifiableCEFRLevel(originalLevel)) {
    return { skipped: true, reason: `Text is already ${originalLevel || 'unknown'} level` };
  }

  const targetLevel = getTargetCEFRLevel(originalLevel) ?? 'B1';
  Sentry.addBreadcrumb({ category: 'ai', message: `Simplifying to ${targetLevel}`, level: 'info' });
  const simplified = await Sentry.startSpan({ name: 'ai:content-simplify', op: 'ai' }, async () => {
    return simplifyContent(passage.content.slice(0, 10000), targetLevel);
  });

  if (!simplified) {
    throw new PassageStudyServiceError('Simplification failed — try again');
  }

  await Sentry.startSpan({ name: 'db:passage-update', op: 'db' }, async () => {
    return db.passage.update({
      where: { id: passageId, userId },
      data: {
        simplifiedContent: simplified.simplifiedText,
        simplifiedLevel: targetLevel,
      },
    });
  });

  return {
    simplifiedContent: simplified.simplifiedText,
    simplifiedLevel: targetLevel,
  };
}

export async function generateQuestionsForPassage(userId: string, passageId: string): Promise<QuestionData[]> {
  const passage = await getOwnedPassage(userId, passageId);
  const contentToAnalyze = passage.simplifiedContent || passage.content;

  Sentry.addBreadcrumb({ category: 'ai', message: 'Generating comprehension questions', level: 'info' });
  const questionResult = await Sentry.startSpan({ name: 'ai:question-gen', op: 'ai' }, async () => {
    return generateComprehensionQuestions(contentToAnalyze.slice(0, 10000), 5);
  });

  if (!questionResult) {
    throw new PassageStudyServiceError('Question generation failed — try again');
  }

  const validQuestions = questionResult.questions.filter(isValidGeneratedQuestion);
  if (questionResult.questions.length === 0) {
    throw new PassageStudyServiceError('No questions generated — try again');
  }
  if (validQuestions.length === 0) {
    throw new PassageStudyServiceError('All generated questions failed validation — try again');
  }

  await Sentry.startSpan({ name: 'db:questions-replace', op: 'db' }, async () => {
    await db.$transaction([
      db.question.deleteMany({ where: { passageId } }),
      db.question.createMany({
        data: validQuestions.map((question) => ({
          passageId,
          ...toQuestionCreateInput(question),
        })),
      }),
    ]);
  });

  return validQuestions.map(toQuestionData);
}

async function getOwnedPassage(userId: string, passageId: string) {
  const passage = await Sentry.startSpan({ name: 'db:passage-fetch', op: 'db' }, async () => {
    return db.passage.findUnique({ where: { id: passageId, userId, deletedAt: null } });
  });

  if (!passage) {
    throw new PassageStudyServiceError('Passage not found');
  }
  return passage;
}

function isValidGeneratedQuestion(question: GeneratedQuestion) {
  const result = questionDataSchema.safeParse({
    questionText: question.questionText,
    options: question.options,
    correctOption: question.correctAnswer,
    sourceText: question.sourceText,
    sourceLine: question.sourceLine,
    explanation: question.explanation,
  });

  if (!result.success) {
    log.warn({ issues: result.error.issues }, 'Generated question failed validation');
  }
  return result.success;
}

function toQuestionCreateInput(question: GeneratedQuestion) {
  return {
    questionText: question.questionText,
    options: JSON.stringify(question.options),
    correctOption: question.correctAnswer,
    sourceText: question.sourceText,
    sourceLine: question.sourceLine,
    explanation: question.explanation,
    questionType: question.questionType,
    difficulty: question.difficulty,
  };
}

function toQuestionData(question: GeneratedQuestion, index: number): QuestionData {
  return {
    id: `pending-${index}`,
    number: index + 1,
    questionText: question.questionText,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    sourceText: question.sourceText,
    sourceLine: question.sourceLine,
    questionType: question.questionType,
    difficulty: question.difficulty,
  };
}

export class PassageStudyServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PassageStudyServiceError';
  }
}
