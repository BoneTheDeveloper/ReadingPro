import 'server-only';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { createModuleLogger } from '@/services/observability/logger';
import { wrapUserText } from './prompt-utils';

const log = createModuleLogger('ai:content-simplifier');

export const simplifiedContentSchema = z.object({
  simplifiedText: z.string().max(15000, 'Simplified text must be under 15000 characters'),
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
      model: openai('gpt-4o-mini'),
      schema: simplifiedContentSchema,
      system: `You are an expert English language educator. Simplify text to target CEFR level while maintaining core meaning, logical flow, and key terminology (with context). Rules: simplify vocabulary, break complex sentences, use shorter paragraphs, add transitions, explain difficult terms in parentheses.`,
      prompt: `Simplify this text to CEFR level ${targetLevel} (${levelDescriptions[targetLevel] || ''}):

${wrapUserText(text)}`,
    });
    return object;
  } catch (error) {
    log.error(
      { err: error, context: { targetLevel, textLength: text.length } },
      'Simplification failed',
    );
    return null;
  }
}
