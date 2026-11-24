"use client";

import { useCallback, useState } from "react";
import { StudioArtifactType } from "@/shared/enums";
import type { StudioPanelView, StudioGridId } from "./studio-icon-list";
import { CollapsedSidebar } from "./collapsed-sidebar";
import { GenerateOptionsDialog } from "./generate-options-dialog";
import { DefaultStudioView } from "./default-studio-view";
import { ChatDetailView } from "../view/ai-chat/chat-detail-view";
import { ChatProvider } from "../view/ai-chat/chat-provider";
import { QuestionDetailView } from "../view/questions/question-detail-view";
import { FlashcardDetailView } from "../view/flashcards";
import { LookupDetailView } from "../view/lookup/lookup-detail-view";
import { useQuery } from "@tanstack/react-query";
import { useDeleteLookupMutation, wordLookupQueries } from "@/client/features/dictionary";
import { artifactQueries } from "../../api/queries";
import {
  useGenerateArtifactMutation,
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
  const generateQuestion = useGenerateArtifactMutation(StudioArtifactType.QUESTION);
  const generateFlashcard = useGenerateArtifactMutation(StudioArtifactType.FLASHCARD);
  const deleteArtifact = useDeleteArtifactMutation();
  const lookupsQuery = useQuery(wordLookupQueries.list(passageId));
  const deleteLookup = useDeleteLookupMutation();

  const closeView = useCallback(() => onViewChange(null), [onViewChange]);

  const openView = useCallback(
    (id: StudioGridId, artifactId?: string) => {
      if (id === "CHAT") {
        onViewChange({ contentType: "chat" });
        return;
      }
      if (id === "LOOKUP") {
        onViewChange({ contentType: "lookup" });
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

  // A generation tile opens the options popup; generating starts from there.
  // The CHAT tile is routed by DefaultStudioView directly to onSelectChat.
  const [configuring, setConfiguring] = useState<
    typeof StudioArtifactType.QUESTION | typeof StudioArtifactType.FLASHCARD | null
  >(null);

  const handleGenerate = useCallback((actionId: StudioGridId) => {
    if (actionId === StudioArtifactType.QUESTION || actionId === StudioArtifactType.FLASHCARD) {
      setConfiguring(actionId);
    }
  }, []);

  const optionsDialog = passageId ? (
    <GenerateOptionsDialog
      type={configuring}
      onClose={() => setConfiguring(null)}
      onGenerate={(type, options) => {
        const mutation = type === StudioArtifactType.QUESTION ? generateQuestion : generateFlashcard;
        mutation.mutate({ passageId, options });
        setConfiguring(null);
      }}
    />
  ) : null;

  if (collapsed) {
    return <CollapsedSidebar onToggleCollapse={onToggleCollapse} />;
  }

  // ChatProvider wraps both default view and chat panel so the Chat instance
  // persists across panel close/open. key={passageId} forces remount when passage changes.
  if (passageId) {
    return (
      <ChatProvider key={passageId} passageId={passageId}>
        {optionsDialog}
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

        {view?.contentType === "lookup" && (
          <LookupDetailView
            // A new selection or row replaces the view, including a search typed into it.
            key={view.request ? `request|${view.request.word}|${view.request.context ?? ""}` : `row|${view.lookupId ?? ""}`}
            passageId={passageId}
            lookupId={view.lookupId}
            request={view.request}
            onClose={closeView}
          />
        )}

        {!view && (
          <DefaultStudioView
            artifacts={artifactsQuery.data ?? []}
            lookups={lookupsQuery.data ?? []}
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
            onSelectLookup={() => openView("LOOKUP")}
            onSelectAction={handleGenerate}
            onOpenArtifact={(type, id) => openView(type, id)}
            onDeleteArtifact={(artifactId) =>
              deleteArtifact.mutate({ artifactId, passageId })
            }
            onOpenLookup={(lookupId) => onViewChange({ contentType: "lookup", lookupId })}
            onDeleteLookup={(lookupId) => deleteLookup.mutate({ lookupId, passageId })}
          />
        )}
      </ChatProvider>
    );
  }

  return (
    <DefaultStudioView
      artifacts={artifactsQuery.data ?? []}
      lookups={[]}
      hasActivePassage={false}
      pendingTypes={[]}
      questionPending={generateQuestion.isPending}
      flashcardPending={generateFlashcard.isPending}
      onToggleCollapse={onToggleCollapse}
      onSelectChat={() => {}}
      onSelectLookup={() => {}}
      onSelectAction={() => {}}
      onOpenArtifact={() => {}}
      onDeleteArtifact={undefined}
      onOpenLookup={() => {}}
    />
  );
}
