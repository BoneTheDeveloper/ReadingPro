import 'server-only';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { createModuleLogger } from '@/services/observability/logger';
import { wrapUserText } from './prompt-utils';

const log = createModuleLogger('ai:question-generator');

export const questionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const generatedQuestionSchema = z.object({
  questionText: z.string(),
  options: z.array(questionOptionSchema).min(2),
  correctAnswer: z.string(),
  sourceText: z.string(),
  sourceLine: z.number().int().positive(),
  explanation: z.string(),
  questionType: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE']),
  difficulty: z.number().int().min(1).max(5),
}).refine(
  (q) => q.options.some(opt => opt.id === q.correctAnswer),
  { message: 'correctAnswer must match one of the option ids', path: ['correctAnswer'] }
);

export const questionGenerationSchema = z.object({
  questions: z.array(generatedQuestionSchema),
  wordCount: z.number(),
  estimatedTime: z.number(),
});

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;
export type QuestionGenerationResult = z.infer<typeof questionGenerationSchema>;

export async function generateComprehensionQuestions(
  passage: string,
  questionCount: number = 5
): Promise<QuestionGenerationResult | null> {
  try {
    const numberedPassage = passage
      .split('\n')
      .map((line, i) => `${i + 1}: ${line}`)
      .join('\n');

    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: questionGenerationSchema,
      system: `You are an expert English language educator. Generate multiple-choice reading comprehension questions that: test understanding (not memory), have clear answers from text, include line number citations, range factual to inferential, cover different parts of passage. Wrong answers should be plausible but clearly incorrect.`,
      prompt: `Generate ${questionCount} reading comprehension questions for this passage:

${wrapUserText(numberedPassage)}`,
    });

    return object;
  } catch (error) {
    log.error(
      { err: error, context: { questionCount, passageLength: passage.length } },
      'Question generation failed',
    );
    return null;
  }
}
