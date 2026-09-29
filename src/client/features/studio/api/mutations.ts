"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { fetchJson } from "@/client/lib/api/fetch-json";
import { artifactQueries, chatQueries } from "./queries";
import {
  studioArtifactListItemSchema,
  type StudioArtifactListItem,
} from "@/shared/studio/artifact";
import type { QuestionProgress, FlashcardProgress } from "@/shared/studio/artifact";
import { StudioArtifactType } from "@/shared/enums";

const generateArtifactResponseSchema = z.object({
  artifact: studioArtifactListItemSchema,
});

/** Starts generating a question set or flashcard deck for a passage. */
export function useGenerateArtifactMutation(type: StudioArtifactType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["artifact", "generate", type],
    mutationFn: (passageId: string) =>
      fetchJson(`/api/artifact/${type.toLowerCase()}`, generateArtifactResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passageId }),
      }),

    // Seed the list cache so the new PENDING row paints immediately. No
    // invalidate here: it would fire a refetch that returns the same row we
    // just seeded, and the list already polls every 2s while non-terminal —
    // that poll is what picks up the COMPLETED transition.
    onSuccess: ({ artifact }, passageId) => {
      queryClient.setQueryData(
        artifactQueries.list(passageId).queryKey,
        (prev: StudioArtifactListItem[] | undefined) =>
          prev ? [artifact, ...prev] : [artifact],
      );
    },
  });
}

type ProgressInput = { artifactId: string; passageId: string } & (
  | { type: typeof StudioArtifactType.QUESTION; progress: QuestionProgress }
  | { type: typeof StudioArtifactType.FLASHCARD; progress: FlashcardProgress }
);

export function useRecordProgressMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ artifactId, progress }: ProgressInput) =>
      fetchJson(
        `/api/artifact/${artifactId}/progress`,
        z.object({ success: z.boolean() }),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progress }),
        },
      ),

    onSuccess: (_data, { artifactId, passageId, type, progress }) => {
      queryClient.setQueryData(
        artifactQueries.list(passageId).queryKey,
        // Matching on type as well as id keeps each progress shape on its own
        // artifact variant, which is what makes the cast below sound.
        (old: StudioArtifactListItem[] | undefined) =>
          old?.map((a) =>
            a.id === artifactId && a.type === type
              ? ({ ...a, progress } as StudioArtifactListItem)
              : a,
          ),
      );
    },
  });
}

export function useResetChatMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    // DELETE /api/ai-chat answers 204 No Content.
    mutationFn: (passageId: string) =>
      fetchJson(
        `/api/ai-chat?passageId=${encodeURIComponent(passageId)}`,
        z.void(),
        { method: "DELETE" },
      ),

    onSuccess: (_data, passageId) => {
      queryClient.removeQueries({
        queryKey: chatQueries.history(passageId).queryKey,
      });
    },
  });
}

export function useDeleteArtifactMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      artifactId,
      passageId,
    }: {
      artifactId: string;
      passageId: string;
    }) => {
      await fetchJson(`/api/artifact/${artifactId}`, z.void(), { method: "DELETE" });
      return { artifactId, passageId };
    },

    onSuccess: ({ artifactId, passageId }) => {
      queryClient.setQueryData(
        artifactQueries.list(passageId).queryKey,
        (old: StudioArtifactListItem[] | undefined) =>
          old?.filter((a) => a.id !== artifactId),
      );
      queryClient.removeQueries({
        queryKey: artifactQueries.detail(artifactId).queryKey,
      });
    },
  });
}
