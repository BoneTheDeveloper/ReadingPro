import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export const questionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const generatedQuestionSchema = z.object({
  questionText: z.string(),
  options: z.array(questionOptionSchema),
  correctAnswer: z.string(),
  sourceText: z.string(),
  sourceLine: z.number().int().positive(),
  explanation: z.string(),
  questionType: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE']),
  difficulty: z.number().int().min(1).max(5),
});

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
      model: google('gemini-1.5-flash'),
      schema: questionGenerationSchema,
      system: `You are an expert English language educator. Generate multiple-choice reading comprehension questions that: test understanding (not memory), have clear answers from text, include line number citations, range factual to inferential, cover different parts of passage. Wrong answers should be plausible but clearly incorrect.`,
      prompt: `Generate ${questionCount} reading comprehension questions for this passage:

${numberedPassage}`,
    });

    return object;
  } catch (error) {
    console.error('Question generation error:', error);
    return null;
  }
}

export function parsePassageLines(passage: string): Array<{ lineNumber: number; text: string }> {
  return passage
    .split('\n')
    .map((line, i) => ({ lineNumber: i + 1, text: line.trim() }))
    .filter(line => line.text.length > 0);
}