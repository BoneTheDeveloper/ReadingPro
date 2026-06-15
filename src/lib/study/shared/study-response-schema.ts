import { z } from "zod";
import { makeResponseSchema, makeSuccessEnvelopeSchema } from "@/lib/api/shared/api-response-schema";

const nullableIsoDateSchema = z.string().nullable();

export const studyQuestionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
}).strict();

export const generatedStudyQuestionSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  questionText: z.string(),
  options: z.array(studyQuestionOptionSchema),
  correctAnswer: z.string(),
  explanation: z.string(),
  sourceText: z.string(),
  sourceLine: z.number().int().positive(),
  questionType: z.string(),
  difficulty: z.number(),
}).strict();

export const generatedStudyQuestionsSchema = z.object({
  questions: z.array(generatedStudyQuestionSchema),
}).strict();

export const generatedStudyQuestionsSuccessResponseSchema = makeSuccessEnvelopeSchema(generatedStudyQuestionsSchema);
export const generatedStudyQuestionsResponseSchema = makeResponseSchema(generatedStudyQuestionsSchema);

export const studyCardPassageSchema = z.object({
  id: z.string(),
  title: z.string(),
}).strict();

export const studyCardQuestionSchema = z.object({
  id: z.string(),
  passageId: z.string(),
  questionText: z.string(),
  options: z.array(studyQuestionOptionSchema),
  correctAnswer: z.string(),
  sourceText: z.string(),
  sourceLine: z.number(),
  explanation: z.string(),
  questionType: z.string(),
  difficulty: z.number(),
  passage: studyCardPassageSchema.optional(),
}).strict();

export const questionReviewSchema = z.object({
  id: z.string(),
  questionId: z.string(),
  qualityRating: z.number(),
  easeFactor: z.number(),
  intervalDays: z.number(),
  repetitions: z.number(),
  nextReviewDate: z.string(),
  reviewedAt: z.string(),
  question: studyCardQuestionSchema.optional(),
}).strict();

export const dueQuestionsSuccessResponseSchema = makeSuccessEnvelopeSchema(z.array(questionReviewSchema));
export const dueQuestionsResponseSchema = makeResponseSchema(z.array(questionReviewSchema));
export const questionReviewSuccessResponseSchema = makeSuccessEnvelopeSchema(questionReviewSchema);
export const questionReviewResponseSchema = makeResponseSchema(questionReviewSchema);

export const progressStatsSchema = z.object({
  totalCards: z.number(),
  matureCards: z.number(),
  dueCards: z.number(),
  todayReviews: z.number(),
  streakDays: z.number().optional(),
  timeStudiedTodaySeconds: z.number().optional(),
  timeStudiedWeekSeconds: z.number().optional(),
  activeDaysThisWeek: z.number().optional(),
  totalQuizAttempts: z.number(),
  avgQuizAccuracy: z.number().nullable(),
  todayQuizAttempts: z.number(),
}).strict();

export const progressStatsSuccessResponseSchema = makeSuccessEnvelopeSchema(progressStatsSchema);
export const progressStatsResponseSchema = makeResponseSchema(progressStatsSchema);

export const quizAttemptSchema = z.object({
  id: z.string(),
  studySessionId: z.string(),
  passageId: z.string().nullable(),
  correctCount: z.number(),
  incorrectCount: z.number(),
  totalQuestions: z.number(),
  accuracyRate: z.number().nullable(),
  startedAt: z.string(),
  completedAt: nullableIsoDateSchema,
}).strict();

export const quizAttemptSuccessResponseSchema = makeSuccessEnvelopeSchema(quizAttemptSchema);
export const quizAttemptResponseSchema = makeResponseSchema(quizAttemptSchema);

export const studySessionSchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  completedAt: nullableIsoDateSchema,
}).strict();

export const studySessionSuccessResponseSchema = makeSuccessEnvelopeSchema(studySessionSchema);
export const studySessionResponseSchema = makeResponseSchema(studySessionSchema);

export const studyChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["system", "user", "assistant"]),
  parts: z.array(z.object({
    type: z.literal("text"),
    text: z.string(),
  }).strict()),
}).strict();

export const studyChatHistorySuccessResponseSchema = z.object({
  messages: z.array(studyChatMessageSchema),
}).strict();
export const studyChatHistoryResponseSchema = z.union([
  studyChatHistorySuccessResponseSchema,
  z.object({ error: z.string() }).strict(),
]);

export type StudyQuestionOptionDto = z.infer<typeof studyQuestionOptionSchema>;
export type GeneratedStudyQuestionDto = z.infer<typeof generatedStudyQuestionSchema>;
export type GeneratedStudyQuestionsDto = z.infer<typeof generatedStudyQuestionsSchema>;
export type StudyCardQuestionDto = z.infer<typeof studyCardQuestionSchema>;
export type QuestionReviewDto = z.infer<typeof questionReviewSchema>;
export type ProgressStatsDto = z.infer<typeof progressStatsSchema>;
export type StudySessionDto = z.infer<typeof studySessionSchema>;
export type QuizAttemptDto = z.infer<typeof quizAttemptSchema>;
export type StudyChatHistoryResponse = z.infer<typeof studyChatHistoryResponseSchema>;

type RawQuestionReview = {
  id: string;
  questionId: string;
  qualityRating: number;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewDate: Date | string;
  reviewedAt: Date | string;
  question?: {
    id: string;
    passageId: string;
    questionText: string;
    options: unknown;
    correctOption?: string;
    correctAnswer?: string;
    sourceText: string;
    sourceLine: number;
    explanation: string;
    questionType: string;
    difficulty: number;
    passage?: {
      id: string;
      title: string;
    };
  };
};

type RawStudySession = {
  id: string;
  startedAt: Date | string;
  completedAt: Date | string | null;
};

type RawQuizAttempt = {
  id: string;
  studySessionId: string;
  passageId: string | null;
  correctCount: number;
  incorrectCount: number;
  totalQuestions: number;
  accuracyRate: number | null;
  startedAt: Date | string;
  completedAt: Date | string | null;
};

export function toQuestionReviewDto(card: RawQuestionReview): QuestionReviewDto {
  const dto: QuestionReviewDto = {
    id: card.id,
    questionId: card.questionId,
    qualityRating: card.qualityRating,
    easeFactor: card.easeFactor,
    intervalDays: card.intervalDays,
    repetitions: card.repetitions,
    nextReviewDate: toIsoString(card.nextReviewDate),
    reviewedAt: toIsoString(card.reviewedAt),
  };

  if (card.question) {
    const optionsResult = z.array(studyQuestionOptionSchema).safeParse(
      normalizeQuestionOptions(card.question.options),
    );
    dto.question = {
      id: card.question.id,
      passageId: card.question.passageId,
      questionText: card.question.questionText,
      options: optionsResult.success ? optionsResult.data : [],
      correctAnswer: card.question.correctAnswer ?? card.question.correctOption ?? "",
      sourceText: card.question.sourceText,
      sourceLine: card.question.sourceLine,
      explanation: card.question.explanation,
      questionType: card.question.questionType,
      difficulty: card.question.difficulty,
    };
    if (card.question.passage) {
      dto.question.passage = {
        id: card.question.passage.id,
        title: card.question.passage.title,
      };
    }
  }

  return dto;
}

export function toStudySessionDto(session: RawStudySession): StudySessionDto {
  return {
    id: session.id,
    startedAt: toIsoString(session.startedAt),
    completedAt: session.completedAt ? toIsoString(session.completedAt) : null,
  };
}

export function toQuizAttemptDto(attempt: RawQuizAttempt): QuizAttemptDto {
  return {
    id: attempt.id,
    studySessionId: attempt.studySessionId,
    passageId: attempt.passageId,
    correctCount: attempt.correctCount,
    incorrectCount: attempt.incorrectCount,
    totalQuestions: attempt.totalQuestions,
    accuracyRate: attempt.accuracyRate,
    startedAt: toIsoString(attempt.startedAt),
    completedAt: attempt.completedAt ? toIsoString(attempt.completedAt) : null,
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function normalizeQuestionOptions(value: unknown) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
