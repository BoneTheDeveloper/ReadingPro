"use client";

import { useState, useCallback } from "react";
import { StudioArtifactType } from "@/generated/prisma/enums";
import type { StudioPanelView, StudioGridId } from "./studio-icon-list";
import { STUDIO_TILES } from "./studio-icon-list";
import { CollapsedSidebar } from "./collapsed-sidebar";
import { DefaultStudioView } from "./default-studio-view";
import { StudioDetailView } from "../view/studio-detail-view";
import { AiChatPanel } from "../view/ai-chat/ai-chat";
import { QuestionDetailView } from "../view/questions/question-detail-view";
import { useArtifactList } from "../../queries";
import { useGenerateQuestion, useDeleteArtifact } from "../../mutations";
import { useArtifactPending } from "../../hook/use-artifact-pending";
import { useChatSession } from "../../hook/use-chat-session";

interface StudioPanelProps {
  passageId: string | null;
  collapsed?: boolean;
  onToggleCollapse: () => void;
}

export function StudioPanel({
  passageId,
  collapsed = false,
  onToggleCollapse,
}: StudioPanelProps) {
  const [view, setView] = useState<StudioPanelView>(null);

  const artifactsQuery = useArtifactList(passageId);
  const generateQuestion = useGenerateQuestion();
  const deleteArtifact = useDeleteArtifact();
  const pendingEntries = useArtifactPending(passageId);
  const { setLocalChatPrefill } = useChatSession(view?.contentType === "chat");

  const closeView = useCallback(() => setView(null), []);

  const openChat = useCallback(() => {
    setLocalChatPrefill(null);
    setView({ contentType: "chat" });
  }, [setLocalChatPrefill]);

  const openArtifact = useCallback(
    (type: StudioGridId, id: string) => {
      if (type === "CHAT") {
        openChat();
      } else {
        setView({ contentType: "question", artifactId: id });
      }
    },
    [openChat],
  );

  const handleActionClick = useCallback(
    (actionId: StudioGridId) => {
      if (!passageId) return;
      const tile = STUDIO_TILES.find((t) => t.gridId === actionId);
      if (!tile) return;

      switch (tile.kind) {
        case "open":
          break;
        case "generate":
          if (actionId === StudioArtifactType.QUESTION) {
            generateQuestion.mutate(passageId);
          }
          // FLASHCARD: Phase 6
          break;
        default: {
          const _exhaustive: never = tile;
          return _exhaustive;
        }
      }
    },
    [passageId, generateQuestion],
  );

  // Render detail view
  if (view?.contentType === "chat" && passageId) {
    return (
      <StudioDetailView
        title="Trò chuyện"
        onClose={closeView}
        onToggleCollapse={onToggleCollapse}
      >
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

  if (collapsed) {
    return <CollapsedSidebar onToggleCollapse={onToggleCollapse} />;
  }

  return (
    <DefaultStudioView
      artifacts={artifactsQuery.data ?? []}
      pendingEntries={pendingEntries}
      hasActivePassage={!!passageId}
      pendingTypes={
        generateQuestion.isPending ? [StudioArtifactType.QUESTION] : []
      }
      onToggleCollapse={onToggleCollapse}
      onSelectChat={openChat}
      onSelectAction={handleActionClick}
      onOpenArtifact={openArtifact}
      onDeleteArtifact={
        passageId
          ? (artifactId) => deleteArtifact.mutate({ artifactId, passageId })
          : undefined
      }
    />
  );
}
