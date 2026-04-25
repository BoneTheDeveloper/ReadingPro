import { z } from "zod";
export const flashcardProgressSchema = z.object({
  currentIndex: z.number().int().nonnegative(),
  isCompleted: z.boolean(),
});
