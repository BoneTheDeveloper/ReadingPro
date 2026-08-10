"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { fetchJson } from "@/lib/api/fetch-json";
import { artifactQueries, chatQueries } from "@/features/studio/api/queries";
import {
  studioArtifactListItemSchema,
  type StudioArtifactListItem,
} from "@/features/studio/schema/artifact";
import type { QuestionProgress, FlashcardProgress } from "@/features/studio/schema/artifact";
import { StudioArtifactType } from "@/generated/prisma/enums";

const generateArtifactResponseSchema = z.object({
  artifact: studioArtifactListItemSchema,
});

export function useGenerateQuestionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["artifact", "generate", StudioArtifactType.QUESTION],
    mutationFn: (passageId: string) =>
      fetchJson("/api/artifact/question", generateArtifactResponseSchema, {
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

export function useRecordProgressMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      artifactId,
      progress,
    }: {
      artifactId: string;
      passageId: string;
      progress: QuestionProgress;
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
        // Narrow to QUESTION: the progress route only accepts question
        // progress, and the flashcard variant carries a different shape.
        (old: StudioArtifactListItem[] | undefined) =>
          old?.map((a) =>
            a.id === artifactId && a.type === StudioArtifactType.QUESTION
              ? { ...a, progress }
              : a,
          ),
      );
    },
  });
}

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
      passageId: _passageId,
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
