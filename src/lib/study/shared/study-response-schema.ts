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

export const studioArtifactResponseSchema = z.object({
  id: z.string(),
  type: z.enum(["quiz", "flashcard"]),
  passageId: z.string(),
  title: z.string(),
  status: z.enum(["generating", "done", "failed"]),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
}).strict();

export const generatedStudyQuestionsSchema = z.object({
  artifact: studioArtifactResponseSchema,
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

export const progressStatsSchema = z.object({
  streakDays: z.number().default(0),
  timeStudiedTodaySeconds: z.number().default(0),
  timeStudiedWeekSeconds: z.number().default(0),
  activeDaysThisWeek: z.number().default(0),
}).strict();

export const progressStatsSuccessResponseSchema = makeSuccessEnvelopeSchema(progressStatsSchema);
export const progressStatsResponseSchema = makeResponseSchema(progressStatsSchema);

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
export type StudioArtifactResponseDto = z.infer<typeof studioArtifactResponseSchema>;
export type StudyCardQuestionDto = z.infer<typeof studyCardQuestionSchema>;
export type ProgressStatsDto = z.infer<typeof progressStatsSchema>;
export type StudySessionDto = z.infer<typeof studySessionSchema>;
export type StudyChatHistoryResponse = z.infer<typeof studyChatHistoryResponseSchema>;

type RawStudySession = {
  id: string;
  startedAt: Date | string;
  completedAt: Date | string | null;
};

export function toStudySessionDto(session: RawStudySession): StudySessionDto {
  return {
    id: session.id,
    startedAt: toIsoString(session.startedAt),
    completedAt: session.completedAt ? toIsoString(session.completedAt) : null,
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
