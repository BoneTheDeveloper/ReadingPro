"use client";

import { useCallback } from "react";
import type { PassageData } from "@/types/passage";
import type {
  ArtifactDetailCacheEntry,
  StudioArtifact,
  StudioPanelView,
} from "@/features/studio-panel/schemas/studio-artifact";
import type { StudioActionId } from "@/features/studio-panel/schemas/studio-action";
import { ChatDetailView } from "./studio/ai-chat/chat-detail-view";
import { QuestionDetailView } from "./studio/questions/question-detail-view";
import { CollapsedSidebar } from "./studio/collapsed-sidebar";
import { DefaultStudioView } from "./studio/default-studio-view";
import { useChatPrefill } from "../hooks/use-chat-prefill";
import { useEscapeToCloseChat } from "../hooks/use-escape-to-close-chat";

interface StudioPanelProps {
  artifacts: StudioArtifact[];
  view: StudioPanelView;
  setView: (view: StudioPanelView) => void;
  artifactDetailById: Record<string, ArtifactDetailCacheEntry>;
  activePassage: PassageData | null;
  hasActivePassage: boolean;
  onActionClick: (actionId: StudioActionId) => void;
  collapsed?: boolean;
  onToggleCollapse: () => void;
  onRecordQuizResult: (artifactId: string, stats: { correctCount: number; totalQuestions: number }) => void;
  onResetQuizResult: (artifactId: string) => void;
  onDeleteArtifact?: (artifactId: string) => void;
  chatPrefill?: string | null;
  onChatPrefillChange?: (prefill: string | null) => void;
}

export function StudioPanel({
  artifacts,
  view,
  setView,
  artifactDetailById,
  activePassage,
  hasActivePassage,
  onActionClick,
  collapsed = false,
  onToggleCollapse,
  onRecordQuizResult,
  onResetQuizResult,
  onDeleteArtifact,
  chatPrefill: chatPrefillProp,
  onChatPrefillChange,
}: StudioPanelProps) {
  const isChatOpen = view?.mode === "chat";
  const chatPassageId = isChatOpen && activePassage ? activePassage.id : null;

  const { chatPrefill, setLocalChatPrefill } = useChatPrefill(
    chatPrefillProp,
    onChatPrefillChange,
    isChatOpen,
  );

  const closeView = useCallback(() => setView(null), [setView]);

  const handleCloseChat = useCallback(() => {
    setView(null);
  }, [setView]);

  const handleClearLocalPrefill = useCallback(() => {
    setLocalChatPrefill(null);
  }, [setLocalChatPrefill]);

  useEscapeToCloseChat(isChatOpen, handleCloseChat, handleClearLocalPrefill);

  const openChat = useCallback(() => {
    setLocalChatPrefill(null);
    setView({ mode: "chat" });
  }, [setView, setLocalChatPrefill]);

  const openArtifact = useCallback(
    (artifact: StudioArtifact) => {
      setView({ mode: "artifact", ref: { type: artifact.type, id: artifact.id } });
    },
    [setView],
  );

  const viewingArtifact =
    view?.mode === "artifact" ? artifacts.find((a) => a.id === view.ref.id) ?? null : null;

  const runningCount = artifacts.filter((r) => r.status === "generating").length;
  const isActionLocked = (actionId: StudioActionId) =>
    actionId === "quiz" && artifacts.some((r) => r.status === "generating" && r.type === "quiz");

  // Route to one of four views based on panel mode.
  if (isChatOpen && chatPassageId) {
    return (
      <ChatDetailView
        passageId={chatPassageId}
        chatPrefill={chatPrefill}
        onClose={handleCloseChat}
        onToggleCollapse={onToggleCollapse}
      />
    );
  }

  if (viewingArtifact) {
    return (
      <QuestionDetailView
        artifact={viewingArtifact}
        detail={artifactDetailById[viewingArtifact.id]}
        onClose={closeView}
        onRecordResult={onRecordQuizResult}
        onResetResult={onResetQuizResult}
      />
    );
  }

  if (collapsed) {
    return (
      <CollapsedSidebar
        hasActivePassage={hasActivePassage}
        onToggleCollapse={onToggleCollapse}
        onSelectChat={openChat}
        onSelectAction={onActionClick}
      />
    );
  }

  return (
    <DefaultStudioView
      artifacts={artifacts}
      hasActivePassage={hasActivePassage}
      runningCount={runningCount}
      isActionLocked={isActionLocked}
      onToggleCollapse={onToggleCollapse}
      onSelectChat={openChat}
      onSelectAction={onActionClick}
      onOpenArtifact={openArtifact}
      onDeleteArtifact={onDeleteArtifact}
    />
  );
}
