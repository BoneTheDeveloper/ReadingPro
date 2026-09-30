import { z } from "zod";
import { VocabularyItemSchema, VocabularyStatusCountsSchema } from "@/shared/vocabulary/schema";

const SetNameSchema = z.string().trim().min(1).max(60);
const ItemIdsSchema = z.array(z.string().uuid()).max(200);

/** A set is a name plus members; progress is counted from member statuses on read. */
export const VocabularySetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.coerce.date(),
  itemCount: z.number().int().nonnegative(),
  progress: VocabularyStatusCountsSchema,
});

export type VocabularySet = z.infer<typeof VocabularySetSchema>;

export const VocabularySetListResponseSchema = z.array(VocabularySetSchema);

export const VocabularySetDetailSchema = VocabularySetSchema.extend({
  items: z.array(VocabularyItemSchema),
});

export type VocabularySetDetail = z.infer<typeof VocabularySetDetailSchema>;

export const VocabularySetCreateInputSchema = z.object({
  name: SetNameSchema,
  itemIds: ItemIdsSchema.default([]),
});

export type VocabularySetCreateInput = z.input<typeof VocabularySetCreateInputSchema>;

export const VocabularySetRenameInputSchema = z.object({ name: SetNameSchema });

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
