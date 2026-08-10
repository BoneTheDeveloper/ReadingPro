# Phase 4: Query & Mutation Layer

## Goal
Add flashcard-specific mutations with simplified progress tracking.

## Simplified Progress Schema

```ts
// Already in artifact.ts
flashcardProgressSchema = {
  clickCount: number,      // Increments on each click (0-5)
  isCompleted: boolean     // true when clickCount >= 5
}
```

## Files to Modify

### `src/features/studio/api/mutations.ts`

```ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { fetchJson } from "@/lib/api/fetch-json";
import { artifactQueries } from "@/features/studio/api/queries";
import {
  studioArtifactListItemSchema,
  type StudioArtifactListItem,
} from "@/features/studio/schema/artifact";
import type { FlashcardProgress } from "@/features/studio/schema/artifact";
import { StudioArtifactType } from "@/generated/prisma/enums";

// ─── Response schemas ──────────────────────────────────────────────

const generateArtifactResponseSchema = z.object({
  artifact: studioArtifactListItemSchema,
});

// ─── Generate Flashcard Mutation ────────────────────────────────────

export function useGenerateFlashcardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["artifact", "generate", StudioArtifactType.FLASHCARD],
    mutationFn: (passageId: string) =>
      fetchJson("/api/artifact/flashcard", generateArtifactResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passageId }),
      }),

    onSuccess: ({ artifact }, passageId) => {
      queryClient.setQueryData(
        artifactQueries.list(passageId).queryKey,
        (prev: StudioArtifactListItem[] | undefined) =>
          prev ? [artifact, ...prev] : [artifact],
      );
    },
  });
}

// ─── Update Flashcard Progress Mutation ─────────────────────────────

export function useUpdateFlashcardProgressMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      artifactId,
      passageId,
      progress,
    }: {
      artifactId: string;
      passageId: string;
      progress: FlashcardProgress;
    }) =>
      fetchJson(
        `/api/artifact/${artifactId}/progress`,
        z.object({ success: z.boolean() }),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progress }),
        },
      ),

    onSuccess: (_data, { artifactId, passageId, progress }) => {
      queryClient.setQueryData(
        artifactQueries.list(passageId).queryKey,
        (old: StudioArtifactListItem[] | undefined) =>
          old?.map((a) =>
            a.id === artifactId && a.type === StudioArtifactType.FLASHCARD
              ? { ...a, progress }
              : a,
          ),
      );
    },
  });
}
```

## Validation

```bash
pnpm typecheck
pnpm lint
```

## Criteria

- [ ] `useGenerateFlashcardMutation` seeds list cache
- [ ] `useUpdateFlashcardProgressMutation` updates cache
- [ ] Progress shape: `{ clickCount, isCompleted }`
- [ ] TypeScript compiles clean
