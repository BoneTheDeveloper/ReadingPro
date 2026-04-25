import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export const cefrAnalysisSchema = z.object({
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  confidence: z.number().min(0).max(1),
  vocabularyLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  grammarComplexity: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  sentenceStructure: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  reasoning: z.string(),
});

export type CEFRAnalysis = z.infer<typeof cefrAnalysisSchema>;

export async function detectCEFRLevel(text: string): Promise<CEFRAnalysis | null> {
  try {
    const { object } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: cefrAnalysisSchema,
      system: `You are an expert English language educator specializing in CEFR level assessment. Analyze vocabulary complexity, grammar structures, sentence variety, and cohesion.`,
      prompt: `Analyze the following text and determine its CEFR level:

Text: ${text.slice(0, 2000)}`,
    });
    return object;
  } catch (error) {
    console.error('CEFR detection error:', error);
    return null;
  }
}

export function getHeuristicCEFR(text: string): string {
  const words = text.split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  const complexWords = words.filter(w => w.length > 6).length;
  const complexWordRatio = complexWords / Math.max(words.length, 1);

  if (avgWordsPerSentence < 10 && complexWordRatio < 0.1) return 'A1';
  if (avgWordsPerSentence < 12 && complexWordRatio < 0.15) return 'A2';
  if (avgWordsPerSentence < 15 && complexWordRatio < 0.2) return 'B1';
  if (avgWordsPerSentence < 18 && complexWordRatio < 0.25) return 'B2';
  if (avgWordsPerSentence < 22 && complexWordRatio < 0.3) return 'C1';
  return 'C2';
}