import { z } from "zod";

export const studySessionRequestSchema = z
  .object({
    userId: z.string().min(1, "userId is required"),
  })
  .strict();

const nullableIsoDateSchema = z.string().nullable();

export const learningSessionSchema = z
  .object({
    id: z.string(),
    startedAt: z.string(),
    completedAt: nullableIsoDateSchema,
  })
  .strict();

export type LearningSessionDto = z.infer<typeof learningSessionSchema>;

type RawLearningSession = {
  id: string;
  startedAt: Date | string;
  completedAt: Date | string | null;
};

export function toLearningSessionDto(
  session: RawLearningSession,
): LearningSessionDto {
  return {
    id: session.id,
    startedAt: toIsoString(session.startedAt),
    completedAt: session.completedAt ? toIsoString(session.completedAt) : null,
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
