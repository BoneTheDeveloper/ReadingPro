'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { db } from '@/lib/db';
import { cefrAnalysisSchema } from '@/lib/ai/cefr-detector';
import { simplifiedContentSchema } from '@/lib/ai/content-simplifier';
import { questionGenerationSchema, type QuestionGenerationResult } from '@/lib/ai/question-generator';
import { getHeuristicCEFR } from '@/lib/ai/cefr-detector';

export async function analyzeContentAction(formData: FormData) {
  const text = formData.get('text') as string;
  const title = (formData.get('title') as string) || 'Untitled';

  if (!text || text.length < 50) {
    return { error: 'Text too short' };
  }

  let originalLevel: string | null = null;
  let simplifiedContent: string | null = null;
  let simplifiedLevel: string | null = null;

  try {
    const { object: cefrResult } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: cefrAnalysisSchema,
      prompt: `Analyze text and return CEFR level: ${text.slice(0, 2000)}`,
    });
    originalLevel = cefrResult.level;
  } catch {
    console.warn('CEFR detection failed, using heuristic');
    originalLevel = getHeuristicCEFR(text);
  }

  if (originalLevel && originalLevel !== 'A1' && originalLevel !== 'A2') {
    const targetMap: Record<string, string> = {
      C2: 'C1', C1: 'B2', B2: 'B1', B1: 'A2',
    };
    const targetLevel = targetMap[originalLevel] || 'B1';

    try {
      const { object: simplified } = await generateObject({
        model: google('gemini-1.5-flash'),
        schema: simplifiedContentSchema,
        prompt: `Simplify to ${targetLevel}: ${text}`,
      });
      simplifiedContent = simplified.simplifiedText;
      simplifiedLevel = targetLevel;
    } catch {
      console.warn('Simplification failed, using original');
    }
  }

  const contentToAnalyze = simplifiedContent || text;

  let questions: QuestionGenerationResult['questions'] = [];

  try {
    const { object: questionResult } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: questionGenerationSchema,
      prompt: `Generate 5 comprehension questions for: ${contentToAnalyze}`,
    });
    questions = questionResult.questions;
  } catch {
    console.warn('Question generation failed');
  }

  const userEmail = 'demo@example.com';
  let user = await db.user.findUnique({ where: { email: userEmail } });
  if (!user) {
    user = await db.user.create({
      data: { email: userEmail, name: 'Demo User' },
    });
  }

  const passage = await db.passage.create({
    data: {
      userId: user.id,
      title,
      content: text,
      simplifiedContent,
      originalLevel: originalLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null,
      simplifiedLevel: simplifiedLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null,
      wordCount: text.split(/\s+/).length,
      sourceType: 'TEXT',
      questions: {
        create: questions.map(q => ({
          questionText: q.questionText,
          options: JSON.stringify(q.options),
          correctOption: q.correctAnswer,
          sourceText: q.sourceText,
          sourceLine: q.sourceLine,
          explanation: q.explanation,
          questionType: q.questionType,
          difficulty: q.difficulty,
        })),
      },
    },
  });

  return {
    passageId: passage.id,
    originalLevel,
    simplifiedLevel,
    questionCount: questions.length,
  };
}