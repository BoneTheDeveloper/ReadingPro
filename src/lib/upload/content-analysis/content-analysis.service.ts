import * as Sentry from '@sentry/nextjs';
import { generateComprehensionQuestions, type GeneratedQuestion } from '@/lib/ai/question-generator';
import { simplifyContent } from '@/lib/ai/content-simplifier';
import { createModuleLogger } from '@/lib/core/logger';
import { db } from '@/lib/db/client';
import {
  getHeuristicCEFR,
  getTargetCEFRLevel,
  isSimplifiableCEFRLevel,
  type CEFRLevel,
} from '@/lib/domain/cefr';

const log = createModuleLogger('features:upload:content-analysis');

type SourceType = 'TEXT' | 'PDF';

export interface AnalyzeAndPersistContentInput {
  userId: string;
  text: string;
  title: string;
  sourceType: SourceType;
  filePath?: string;
}

export interface AnalyzeAndPersistContentResult {
  passageId: string;
  originalLevel: CEFRLevel;
  simplifiedLevel: CEFRLevel | null;
  questionCount: number;
}

export async function analyzeAndPersistContent({
  userId,
  text,
  title,
  sourceType,
  filePath,
}: AnalyzeAndPersistContentInput): Promise<AnalyzeAndPersistContentResult> {
  const truncatedText = text.slice(0, 10000);

  Sentry.addBreadcrumb({ category: 'analysis', message: 'Computing CEFR level', level: 'info' });
  const originalLevel = getHeuristicCEFR(truncatedText);
  const targetLevel = isSimplifiableCEFRLevel(originalLevel)
    ? getTargetCEFRLevel(originalLevel)
    : null;

  let simplifiedContent: string | null = null;
  let simplifiedLevel: CEFRLevel | null = null;

  if (targetLevel) {
    try {
      Sentry.addBreadcrumb({ category: 'ai', message: `Simplifying to ${targetLevel}`, level: 'info' });
      const simplified = await Sentry.startSpan({ name: 'ai:content-simplify', op: 'ai' }, async () => {
        return simplifyContent(truncatedText, targetLevel);
      });
      if (simplified) {
        simplifiedContent = simplified.simplifiedText;
        simplifiedLevel = targetLevel;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.warn(
        { err, context: { targetLevel, originalLevel } },
        'Content simplification failed; saving original text',
      );
    }
  }

  const questions = await generateQuestionsForContent(simplifiedContent || text);
  const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;

  const artifactId = crypto.randomUUID();

  Sentry.addBreadcrumb({ category: 'db', message: 'Creating passage with questions', level: 'info' });
  const passage = await Sentry.startSpan({ name: 'db:passage-create', op: 'db' }, async () => {
    return db.passage.create({
      data: {
        userId,
        title,
        content: text,
        simplifiedContent,
        originalLevel,
        simplifiedLevel,
        wordCount,
        sourceType,
        filePath,
        ...(questions.length > 0 ? {
          studioArtifacts: {
            create: {
              id: artifactId,
              userId,
              type: 'quiz',
              title: 'Initial Quiz',
              status: 'done',
            }
          },
          questions: {
            create: questions.map((q) => ({
              ...toQuestionCreateInput(q),
              artifactId,
            })),
          },
        } : {}),
      },
    });
  });

  return {
    passageId: passage.id,
    originalLevel,
    simplifiedLevel,
    questionCount: questions.length,
  };
}

async function generateQuestionsForContent(content: string) {
  try {
    Sentry.addBreadcrumb({ category: 'ai', message: 'Generating comprehension questions', level: 'info' });
    const questionResult = await Sentry.startSpan({ name: 'ai:question-gen', op: 'ai' }, async () => {
      return generateComprehensionQuestions(content.slice(0, 10000), 5);
    });
    return questionResult?.questions ?? [];
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.warn(
      { err, context: { contentLength: content.length } },
      'Question generation failed; passage saved without questions',
    );
    return [];
  }
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
