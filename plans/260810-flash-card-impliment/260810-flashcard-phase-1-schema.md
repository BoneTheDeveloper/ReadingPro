# Phase 1: Unified Artifact Schema

## Goal
Single `artifact.ts` with Zod discriminated union for artifact variants.

## File to Create

### `src/features/studio/schema/artifact.ts`

```ts
import { z } from "zod";
import { ProcessingStatus, StudioArtifactType } from "@/generated/prisma/enums";

// ─── Question Content ──────────────────────────────────────────────

const QUESTION_OPTIONS_COUNT = 4 as const;

const questionItemSchema = z.object({
  text: z.string(),
  options: z.array(z.string()).length(QUESTION_OPTIONS_COUNT),
  correctIndex: z.number().int().min(0).max(QUESTION_OPTIONS_COUNT - 1),
  sourceText: z.string(),
  explanation: z.string(),
});

export const questionContentSchema = z.object({
  questions: z.array(questionItemSchema).min(1),
});

export type QuestionContent = z.infer<typeof questionContentSchema>;

export const questionProgressSchema = z.object({
  currentIndex: z.number().int().nonnegative(),
  answers: z.array(z.number().int().nullable()),
  correctCount: z.number().int().nonnegative(),
  isCompleted: z.boolean(),
});

export type QuestionProgress = z.infer<typeof questionProgressSchema>;

// ─── Flashcard Content ─────────────────────────────────────────────

const flashcardItemSchema = z.object({
  front: z.string(),
  back: z.string(),
});

export const flashcardContentSchema = z.object({
  cards: z.array(flashcardItemSchema).length(5),
});

export type FlashcardContent = z.infer<typeof flashcardContentSchema>;

export const flashcardProgressSchema = z.object({
  clickCount: z.number().int().nonnegative().max(5),
  isCompleted: z.boolean(),
});

export type FlashcardProgress = z.infer<typeof flashcardProgressSchema>;

// ─── Common Fields ─────────────────────────────────────────────────

const artifactCommon = {
  id: z.string(),
  passageId: z.string(),
  createdAt: z.coerce.date(),
  status: z.enum(ProcessingStatus),
} as const;

// ─── Discriminated Union ───────────────────────────────────────────

export const studioArtifactSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(StudioArtifactType.QUESTION),
    progress: questionProgressSchema.nullable(),
    content: questionContentSchema,
  }).extend(artifactCommon),

  z.object({
    type: z.literal(StudioArtifactType.FLASHCARD),
    progress: flashcardProgressSchema.nullable(),
    content: flashcardContentSchema,
  }).extend(artifactCommon),
]);

export type StudioArtifact = z.infer<typeof studioArtifactSchema>;
```

## Files to Delete

- `src/features/studio/schema/question.ts`
- `src/features/studio/schema/flashcard.ts`

## Validation

```bash
pnpm typecheck
pnpm lint
```

## Update Imports After

| File | Change |
|------|--------|
| `src/features/studio/api/queries.ts` | Import `studioArtifactSchema` from artifact.ts |
| `src/features/studio/api/mutations.ts` | Import progress types from artifact.ts |
| `src/features/studio/server/service/question-generator.ts` | Import `questionContentSchema` from artifact.ts |
| `src/app/api/artifact/question/route.ts` | Import from artifact.ts |

## Criteria

- [ ] Single `artifact.ts` with all schemas
- [ ] Discriminated union with `type` as discriminator
- [ ] Question content + progress grouped
- [ ] Flashcard content + progress grouped
- [ ] Common fields via `.extend()`
- [ ] All imports updated
- [ ] `pnpm typecheck` passes
