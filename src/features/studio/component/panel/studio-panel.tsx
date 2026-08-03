"use client";

import { useCallback } from "react";
import { StudioArtifactType } from "@/generated/prisma/enums";
import type { StudioPanelView, StudioGridId } from "./studio-icon-list";
import { CollapsedSidebar } from "./collapsed-sidebar";
import { DefaultStudioView } from "./default-studio-view";
import { StudioDetailView } from "../view/studio-detail-view";
import { AiChatPanel } from "../view/ai-chat/ai-chat";
import { QuestionDetailView } from "../view/questions/question-detail-view";
import { useArtifactList } from "../../queries";
import { useGenerateQuestion, useDeleteArtifact } from "../../mutations";
import { useChatSession } from "../../hook/use-chat-session";

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
  const artifactsQuery = useArtifactList(passageId);
  const generateQuestion = useGenerateQuestion();
  const deleteArtifact = useDeleteArtifact();
  const { setLocalChatPrefill } = useChatSession(view?.contentType === "chat");

  const closeView = useCallback(() => onViewChange(null), [onViewChange]);

  const openView = useCallback(
    (id: StudioGridId, artifactId?: string) => {
      if (id === "CHAT") {
        setLocalChatPrefill(null);
        onViewChange({ contentType: "chat" });
        return;
      }
      if (!artifactId) return;
      onViewChange({ contentType: "question", artifactId });
    },
    [setLocalChatPrefill, onViewChange],
  );

  // Tile click on a generation tile kicks off an async artifact creation.
  // The CHAT tile is routed by DefaultStudioView directly to onSelectChat.
  const handleGenerate = useCallback(
    (actionId: StudioGridId) => {
      if (!passageId) return;
      if (actionId === StudioArtifactType.QUESTION) {
        generateQuestion.mutate(passageId);
      }
      // FLASHCARD: Phase 6
    },
    [passageId, generateQuestion],
  );

  if (collapsed) {
    return <CollapsedSidebar onToggleCollapse={onToggleCollapse} />;
  }

  if (view?.contentType === "chat" && passageId) {
    return (
      <StudioDetailView title="Trò chuyện" onClose={closeView}>
        <AiChatPanel
          key={passageId}
          passageId={passageId}
          prefilledQuestion={null}
        />
      </StudioDetailView>
    );
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

  const artifacts = artifactsQuery.data ?? [];
  const pendingTypes = artifacts.some(
    (a) => a.status === "PENDING" && a.type === StudioArtifactType.QUESTION,
  )
    ? [StudioArtifactType.QUESTION]
    : [];

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
