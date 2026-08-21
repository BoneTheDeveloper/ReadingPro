"use client";

import { useCallback } from "react";
import { StudioArtifactType } from "@/generated/prisma/enums";
import type { StudioPanelView, StudioGridId } from "./studio-icon-list";
import { CollapsedSidebar } from "./collapsed-sidebar";
import { DefaultStudioView } from "./default-studio-view";
import { ChatDetailView } from "../view/ai-chat/chat-detail-view";
import { ChatProvider } from "../view/ai-chat/chat-context";
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

  // ChatProvider wraps both default view and chat panel so the Chat instance
  // persists across panel close/open. key={passageId} forces remount when passage changes.
  if (passageId) {
    return (
      <ChatProvider key={passageId} passageId={passageId}>
        {view?.contentType === "chat" && (
          <ChatDetailView passageId={passageId} onClose={closeView} />
        )}

        {view?.contentType === "question" && (
          <QuestionDetailView
            artifactId={view.artifactId}
            passageId={passageId}
            onClose={closeView}
          />
        )}

        {view?.contentType === "flashcard" && (
          <FlashcardDetailView
            artifactId={view.artifactId}
            passageId={passageId}
            onClose={closeView}
          />
        )}

        {!view && (
          <DefaultStudioView
            artifacts={artifactsQuery.data ?? []}
            hasActivePassage={true}
            pendingTypes={
              artifactsQuery.data
                ?.filter((a) => a.status === "PENDING")
                .map((a) => a.type) ?? []
            }
            questionPending={generateQuestion.isPending}
            flashcardPending={generateFlashcard.isPending}
            onToggleCollapse={onToggleCollapse}
            onSelectChat={() => openView("CHAT")}
            onSelectAction={handleGenerate}
            onOpenArtifact={(type, id) => openView(type, id)}
            onDeleteArtifact={(artifactId) =>
              deleteArtifact.mutate({ artifactId, passageId })
            }
          />
        )}
      </ChatProvider>
    );
  }

  return (
    <DefaultStudioView
      artifacts={artifactsQuery.data ?? []}
      hasActivePassage={false}
      pendingTypes={[]}
      questionPending={generateQuestion.isPending}
      flashcardPending={generateFlashcard.isPending}
      onToggleCollapse={onToggleCollapse}
      onSelectChat={() => {}}
      onSelectAction={() => {}}
      onOpenArtifact={() => {}}
      onDeleteArtifact={undefined}
    />
  );
}
