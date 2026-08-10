"use client";

import { useCallback } from "react";
import { StudioArtifactType } from "@/generated/prisma/enums";
import type { StudioPanelView, StudioGridId } from "./studio-icon-list";
import { CollapsedSidebar } from "./collapsed-sidebar";
import { DefaultStudioView } from "./default-studio-view";
import { ChatDetailView } from "../view/ai-chat/chat-detail-view";
import { QuestionDetailView } from "../view/questions/question-detail-view";
import { FlashcardDetailView } from "../view/flashcards";
import { useQuery } from "@tanstack/react-query";
import { artifactQueries } from "../../api/queries";
import {
  useGenerateQuestionMutation,
  useGenerateFlashcardMutation,
  useDeleteArtifactMutation,
} from "../../api/mutations";

interface StudioPanelProps {
  passageId: string | null;
  view: StudioPanelView;
  onViewChange: (view: StudioPanelView) => void;
  collapsed?: boolean;
  onToggleCollapse: () => void;
}

export function StudioPanel({
  passageId,
  view,
  onViewChange,
  collapsed = false,
  onToggleCollapse,
}: StudioPanelProps) {
  const artifactsQuery = useQuery(artifactQueries.list(passageId));
  const generateQuestion = useGenerateQuestionMutation();
  const generateFlashcard = useGenerateFlashcardMutation();
  const deleteArtifact = useDeleteArtifactMutation();

  const closeView = useCallback(() => onViewChange(null), [onViewChange]);

  const openView = useCallback(
    (id: StudioGridId, artifactId?: string) => {
      if (id === "CHAT") {
        onViewChange({ contentType: "chat" });
        return;
      }
      if (!artifactId) return;
      if (id === StudioArtifactType.FLASHCARD) {
        onViewChange({ contentType: "flashcard", artifactId });
        return;
      }
      onViewChange({ contentType: "question", artifactId });
    },
    [onViewChange],
  );

  // Tile click on a generation tile kicks off an async artifact creation.
  // The CHAT tile is routed by DefaultStudioView directly to onSelectChat.
  const handleGenerate = useCallback(
    (actionId: StudioGridId) => {
      if (!passageId) return;
      if (actionId === StudioArtifactType.QUESTION) {
        generateQuestion.mutate(passageId);
      } else if (actionId === StudioArtifactType.FLASHCARD) {
        generateFlashcard.mutate(passageId);
      }
    },
    [passageId, generateQuestion, generateFlashcard],
  );

  if (collapsed) {
    return <CollapsedSidebar onToggleCollapse={onToggleCollapse} />;
  }

  if (view?.contentType === "chat" && passageId) {
    return <ChatDetailView key={passageId} passageId={passageId} onClose={closeView} />;
  }

  if (view?.contentType === "question") {
    return (
      <QuestionDetailView
        artifactId={view.artifactId}
        passageId={passageId ?? ""}
        onClose={closeView}
      />
    );
  }

  if (view?.contentType === "flashcard") {
    return (
      <FlashcardDetailView
        artifactId={view.artifactId}
        passageId={passageId ?? ""}
        onClose={closeView}
      />
    );
  }

  const artifacts = artifactsQuery.data ?? [];
  const pendingTypes = artifacts
    .filter((a) => a.status === "PENDING")
    .map((a) => a.type);

  return (
    <DefaultStudioView
      artifacts={artifacts}
      hasActivePassage={!!passageId}
      pendingTypes={pendingTypes}
      onToggleCollapse={onToggleCollapse}
      onSelectChat={() => openView("CHAT")}
      onSelectAction={handleGenerate}
      onOpenArtifact={(type, id) => openView(type, id)}
      onDeleteArtifact={
        passageId
          ? (artifactId) => deleteArtifact.mutate({ artifactId, passageId })
          : undefined
      }
    />
  );
}
