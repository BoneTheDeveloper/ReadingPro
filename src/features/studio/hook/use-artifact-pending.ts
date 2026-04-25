"use client";

import { useMutationState } from "@tanstack/react-query";
import { StudioArtifactType } from "@/generated/prisma/enums";

export interface PendingEntry {
  submittedAt: number;
  status: "pending" | "error";
  error: unknown;
}

export function useArtifactPending(_passageId: string | null): PendingEntry[] {
  return useMutationState({
    filters: { mutationKey: ["artifact", "generate", StudioArtifactType.QUESTION], status: "pending" },
    select: (mutation) => ({
      submittedAt: mutation.state.submittedAt ?? Date.now(),
      status: mutation.state.status === "error" ? "error" as const : "pending" as const,
      error: mutation.state.error,
    }),
  });
}
