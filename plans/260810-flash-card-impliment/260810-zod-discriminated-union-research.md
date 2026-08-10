# Research Report: Zod Discriminated Union for Artifact Variants

## Context
Researching best practices for Zod discriminated unions to handle artifact variants (question, flashcard) with shared + specific fields.

## Findings

### Zod Pattern: Discriminated Union

```ts
// Shared base for common fields
const artifactBase = {
  id: z.string(),
  passageId: z.string(),
  createdAt: z.coerce.date(),
  status: z.enum(ProcessingStatus),
} as const;

// Variant 1: Question
const questionVariant = z.object({
  type: z.literal(StudioArtifactType.QUESTION),
  progress: questionProgressSchema.nullable(),
  content: questionContentSchema,  // specific content
});

// Variant 2: Flashcard
const flashcardVariant = z.object({
  type: z.literal(StudioArtifactType.FLASHCARD),
  progress: flashcardProgressSchema.nullable(),
  content: flashcardContentSchema,  // specific content
});

// Union - discriminated by "type"
export const artifactSchema = z.discriminatedUnion("type", [
  questionVariant.extend(artifactBase),
  flashcardVariant.extend(artifactBase),
]);
```

### Key Points from Zod Docs

1. **Discriminator key**: Use `type` field to determine variant
2. **Common fields**: Use `.extend()` to add shared fields
3. **Faster validation**: Zod checks `type` first, then validates specific fields
4. **Better errors**: Clear error messages per variant

### Alternative: Nesting (for many variants)

```ts
// Group related variants
const questionVariants = z.discriminatedUnion("type", [
  questionVariant,
  // future question types...
]);

const flashcardVariants = z.discriminatedUnion("type", [
  flashcardVariant,
  // future flashcard types...
]);

// Top-level union
const allArtifacts = z.discriminatedUnion("type", [
  questionVariants,
  flashcardVariants,
]);
```

## Recommendation for Artifact Schema

Use the **simple discriminated union** (first pattern) — cleaner, less nesting, easy to extend.

```ts
// artifact.ts
import { z } from "zod";
import { StudioArtifactType } from "@/generated/prisma/enums";

// ─── Content schemas ──────────────────────────────────────────────

// Question content
export const questionContentSchema = z.object({
  questions: z.array(z.object({
    text: z.string(),
    options: z.array(z.string()).length(4),
    correctIndex: z.number(),
    sourceText: z.string(),
    explanation: z.string(),
  }))
});

export const questionProgressSchema = z.object({
  currentIndex: z.number(),
  answers: z.array(z.number().nullable()),
  correctCount: z.number(),
  isCompleted: z.boolean(),
});

// Flashcard content
export const flashcardContentSchema = z.object({
  cards: z.array(z.object({
    front: z.string(),
    back: z.string(),
  })).length(5),
});

export const flashcardProgressSchema = z.object({
  currentIndex: z.number(),
  reviewedIndices: z.array(z.number()),
  isCompleted: z.boolean(),
});

// ─── Discriminated unions ─────────────────────────────────────────

const artifactCommon = {
  id: z.string(),
  passageId: z.string(),
  createdAt: z.coerce.date(),
  status: z.enum(["PENDING", "COMPLETED"]),
} as const;

export const artifactSchema = z.discriminatedUnion("type", [
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
```

## Unresolved Questions

1. Should list endpoint use same schema (with nullable content) or separate list schema?
