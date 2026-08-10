# Flashcard Artifact Feature Plan

## Context

User wants to add flashcard generation as a second artifact type (like question generation). Currently `StudioArtifact` supports `QUESTION` type with clear schema separation. The flashcard should follow the same patterns.

## Requirements

- **Content**: 5 AI-generated cards per passage
  - Front: term/quote/question from passage
  - Back: answer/definition
- **Review UI**: Flip card + "Remember" / "Not Remember" buttons
- **Progress persistence**: Save on each card interaction + on natural exit (beforeunload)
- **Exit mid-session**: Progress updates even without completion

## Schema Changes

### 1. `src/features/studio/schema/flashcard.ts`

```ts
// Replace current content (split from question.ts)

// Card structure
export const flashcardSchema = z.object({
  front: z.string(),      // Term/quote/question
  back: z.string(),       // Answer
  sourceText: z.string(), // Context from passage (optional)
});

export const flashcardContentSchema = z.object({
  cards: z.array(flashcardSchema).length(5), // Always 5 cards
});

export type FlashcardContent = z.infer<typeof flashcardContentSchema>;

// Keep existing progress schema
export const flashcardProgressSchema = z.object({
  currentIndex: z.number().int().nonnegative(),
  reviewedIndices: z.array(z.number().int().nonnegative()), // Cards user clicked
  isCompleted: z.boolean(),
});
```

### 2. `src/features/studio/schema/artifact.ts`

```ts
// Remove cross-imports, clean discriminated union

import { ProcessingStatus, StudioArtifactType } from "@/generated/prisma/enums";

const artifactCommon = {
  id: z.string(),
  passageId: z.string(),
  createdAt: z.coerce.date(),
  status: z.enum(ProcessingStatus),
} as const;

// Each variant imports its own schemas
const questionVariant = z.object({
  type: z.literal(StudioArtifactType.QUESTION),
  progress: questionProgressSchema.nullable(), // from question.ts
});

const flashcardVariant = z.object({
  type: z.literal(StudioArtifactType.FLASHCARD),
  progress: flashcardProgressSchema.nullable(), // from flashcard.ts
});

// Full detail schemas (with content)
export const studioQuestionSchema = questionVariant
  .extend(artifactCommon)
  .extend({ content: questionContentSchema });

export const studioFlashcardSchema = flashcardVariant
  .extend(artifactCommon)
  .extend({ content: flashcardContentSchema });

// Union types
export const studioArtifactSchema = z.discriminatedUnion("type", [
  studioQuestionSchema,
  studioFlashcardSchema,
]);

export const studioArtifactListItemSchema = z.discriminatedUnion("type", [
  questionVariant.extend(artifactCommon),
  flashcardVariant.extend(artifactCommon),
]);
```

### 3. `src/features/studio/schema/question.ts`

No changes needed. Already clean.

## API Routes

### 1. `src/app/api/artifact/flashcard/route.ts` (NEW)

```ts
// POST /api/artifact/flashcard
// Creates flashcard artifact and triggers AI generation
// Pattern: mirror question/route.ts
```

### 2. `src/app/api/artifact/[id]/progress/route.ts` (MODIFY)

```ts
// PATCH - accept both question and flashcard progress
// Check artifact.type to validate correct progress schema
```

## Service Layer

### 1. `src/features/studio/server/service/flashcard-generator.ts` (NEW)

```ts
// Template from question-generator.ts

const FLASHCARD_SYSTEM_PROMPT = `Generate 5 flashcards from the passage.
Each card:
- Front: A key term, quote, or question from the passage
- Back: Clear answer/definition
- Source: Brief context from passage

Focus on meaningful content worth memorizing.`;

async function generateFlashcards(passage: string): Promise<FlashcardContent> {
  // Use generateObject with flashcardContentSchema
}

export async function generateAndStoreFlashcard(args: {
  artifactId: string;
  userId: string;
  passageId: string;
}): Promise<void> {
  // Pattern: findPassage → generate → updateArtifactStatus
}
```

## API/Query Layer

### `src/features/studio/api/mutations.ts` (ADD)

```ts
// useGenerateFlashcardMutation
// Pattern: same as useGenerateQuestionMutation
```

## Progress Tracking

### Client-side Progress Auto-save

```ts
// In flashcard review component
useEffect(() => {
  // Save progress on each interaction
}, [currentIndex, reviewedIndices]);

// Save on natural exit (navigate away, close tab)
useEffect(() => {
  const handleBeforeUnload = () => {
    // Fire-and-forget progress save
    navigator.sendBeacon('/api/artifact/[id]/progress', JSON.stringify({ progress }));
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, []);
```

## File Changes

| File | Action |
|------|--------|
| `src/features/studio/schema/flashcard.ts` | Rewrite with flashcardContentSchema |
| `src/features/studio/schema/artifact.ts` | Clean discriminated unions |
| `src/features/studio/schema/question.ts` | No change |
| `src/app/api/artifact/flashcard/route.ts` | New |
| `src/app/api/artifact/[id]/progress/route.ts` | Modify |
| `src/features/studio/server/service/flashcard-generator.ts` | New |
| `src/features/studio/api/mutations.ts` | Add flashcard mutation |
| `src/features/studio/api/queries.ts` | Update for flashcard detail |

## Validation Steps

1. `pnpm typecheck`
2. `pnpm lint`
3. Test: Generate flashcards from passage
4. Test: Review flip interaction
5. Test: Progress persists on page refresh
6. Test: Progress saves on tab close (beforeunload)
