import { z } from "zod";
import { VocabularyItemSchema, VocabularyStatusCountsSchema } from "@/shared/vocabulary/schema";

const SetNameSchema = z.string().trim().min(1).max(60);
const ItemIdsSchema = z.array(z.string().uuid()).max(200);

/**
 * A set is a name plus the words filed in it; a word is in exactly one set.
 * Every set looks the same whether it was built by hand or generated; progress
 * is counted from member statuses on read.
 */
export const VocabularySetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  /** The set new words land in; it cannot be deleted. */
  isDefault: z.boolean(),
  /** New words of this set that may be introduced per day. */
  dailyNewLimit: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
  /** Most recent rating of any word in this set, from any review; null if never studied. */
  lastStudiedAt: z.coerce.date().nullable(),
  /** Whether that rating falls in the user's current local day. */
  studiedToday: z.boolean(),
  itemCount: z.number().int().nonnegative(),
  progress: VocabularyStatusCountsSchema,
  items: z.array(VocabularyItemSchema),
});

export type VocabularySet = z.infer<typeof VocabularySetSchema>;

export const VocabularySetListResponseSchema = z.array(VocabularySetSchema);

export const VocabularySetCreateInputSchema = z.object({
  name: SetNameSchema,
  itemIds: ItemIdsSchema.default([]),
});

export type VocabularySetCreateInput = z.input<typeof VocabularySetCreateInputSchema>;

export const SET_DAILY_NEW_LIMIT_MAX = 999;

export const VocabularySetUpdateInputSchema = z
  .object({
    name: SetNameSchema,
    dailyNewLimit: z.number().int().min(0).max(SET_DAILY_NEW_LIMIT_MAX),
  })
  .partial()
  .refine((input) => input.name !== undefined || input.dailyNewLimit !== undefined, {
    message: "Nothing to update",
  });

export type VocabularySetUpdateInput = z.infer<typeof VocabularySetUpdateInputSchema>;

export const GENERATED_SET_MAX_SIZE = 50;

export const VocabularySetGenerateInputSchema = z.object({
  name: SetNameSchema,
  size: z.number().int().min(1).max(GENERATED_SET_MAX_SIZE),
});

export type VocabularySetGenerateInput = z.infer<typeof VocabularySetGenerateInputSchema>;

export const VocabularySetItemsInputSchema = z.object({
  itemIds: ItemIdsSchema.min(1),
});

export const VocabularySetIdParamSchema = z.object({ id: z.string().uuid() });

export const VocabularySetItemParamSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
});

/** The only tier that may generate a set. */
export const PRO_TIER = "PRO";
