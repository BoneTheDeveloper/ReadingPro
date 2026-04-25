import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export const simplifiedContentSchema = z.object({
  simplifiedText: z.string(),
  changes: z.array(z.string()),
  retainedKeyTerms: z.array(z.string()),
});

export type SimplifiedContent = z.infer<typeof simplifiedContentSchema>;

const levelDescriptions: Record<string, string> = {
  A1: 'beginner - use simple present tense, basic vocabulary',
  A2: 'elementary - use past/future tenses, common vocabulary',
  B1: 'intermediate - use present perfect, moderate vocabulary',
  B2: 'upper intermediate - use passive voice, varied vocabulary',
  C1: 'advanced - use complex structures, academic vocabulary',
  C2: 'mastery - maintain complexity, improve clarity',
};

export async function simplifyContent(
  text: string,
  targetLevel: string
): Promise<SimplifiedContent | null> {
  try {
    const { object } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: simplifiedContentSchema,
      system: `You are an expert English language educator. Simplify text to target CEFR level while maintaining core meaning, logical flow, and key terminology (with context). Rules: simplify vocabulary, break complex sentences, use shorter paragraphs, add transitions, explain difficult terms in parentheses.`,
      prompt: `Simplify this text to CEFR level ${targetLevel} (${levelDescriptions[targetLevel] || ''}):

Original: ${text}`,
    });
    return object;
  } catch (error) {
    console.error('Simplification error:', error);
    return null;
  }
}