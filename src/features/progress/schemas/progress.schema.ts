import { z } from "zod";

export const progressStatsSchema = z
  .object({
    streakDays: z.number().default(0),
    timeStudiedTodaySeconds: z.number().default(0),
    timeStudiedWeekSeconds: z.number().default(0),
    activeDaysThisWeek: z.number().default(0),
  })
  .strict();

export type ProgressStatsDto = z.infer<typeof progressStatsSchema>;
