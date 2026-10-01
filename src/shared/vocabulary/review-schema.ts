import { z } from "zod";
import { PartOfSpeech, ReviewRating, VocabularyStatus } from "@/shared/enums";

/** A word as shown in review, with the due date each rating would produce. */
const ReviewCardSchema = z.object({
  id: z.string().uuid(),
  term: z.string(),
  translation: z.string(),
  partofSpeech: z.nativeEnum(PartOfSpeech),
  status: z.nativeEnum(VocabularyStatus),
  dueAt: z.coerce.date(),
  scheduledDays: z.number().int().nonnegative(),
  contextSentence: z.string().nullable(),
  passage: z.object({ id: z.string().uuid(), title: z.string() }).nullable(),
  nextDue: z.object({
    AGAIN: z.coerce.date(),
    HARD: z.coerce.date(),
    GOOD: z.coerce.date(),
    EASY: z.coerce.date(),
  }),
});

export type ReviewCard = z.infer<typeof ReviewCardSchema>;

export const ReviewDueResponseSchema = z.object({
  cards: z.array(ReviewCardSchema),
  dueCount: z.number().int().nonnegative(),
  newCount: z.number().int().nonnegative(),
});

export type ReviewDueResponse = z.infer<typeof ReviewDueResponseSchema>;

export const ReviewDueQuerySchema = z.object({
  setId: z.string().uuid().optional(),
});

export const ReviewSessionSchema = z.object({
  id: z.string().uuid(),
  vocabularySetId: z.string().uuid().nullable(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().nullable(),
  cardsReviewed: z.number().int().nonnegative(),
});

export type ReviewSession = z.infer<typeof ReviewSessionSchema>;

export const ReviewSessionCreateInputSchema = z.object({
  setId: z.string().uuid().optional(),
});

export const ReviewSessionIdParamSchema = z.object({ id: z.string().uuid() });

export const ReviewRatingInputSchema = z.object({
  vocabularyItemId: z.string().uuid(),
  rating: z.nativeEnum(ReviewRating),
  /* Generated once per rating by the client; a resend reuses it. */
  clientReviewId: z.string().uuid(),
  durationMs: z.number().int().min(0).max(600_000).optional(),
});

export type ReviewRatingInput = z.infer<typeof ReviewRatingInputSchema>;

export const ReviewRatingResponseSchema = z.object({ card: ReviewCardSchema });
