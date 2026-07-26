"use client";

import { Group, Panel, Separator } from "react-resizable-panels";
import type { PassageData } from "@/types/passage";
import { SourcesPanel } from "@/features/upload/components/panel/sources-panel";
import { ContentPanel } from "@/features/reading/components/content-panel";
import { StudioPanel } from "@/features/studio-panel/components/studio-panel";
import { UploadModal } from "@/features/upload/components/model/upload-modal";
import { useStudioArtifactQuery } from "@/features/studio-panel/hooks/use-studio-artifact-query";
import { useQuestionMutation } from "@/features/studio-panel/hooks/use-question-mutation";
import { useStudyPanelLayout } from "../_hooks/use-study-panel-layout";
import { useStudyWorkspaceState } from "../_hooks/use-study-workspace";

export function StudyWorkspace({
  initialPassages,
}: {
  initialPassages: PassageData[];
}) {
  const {
    state,
    setState,
    activePassage,
    documents,
    isUploading,
    uploadingFileName,
    handleSelectDocument,
    handleOpenUploadModal,
    handleCloseUploadModal,
    handleUploadStart,
    handleUploadComplete,
    handleUploadError,
    handleDeletePassage,
    handleClearUploadError,
  } = useStudyWorkspaceState(initialPassages);

  const artifactQuery = useStudioArtifactQuery({
    passageId: state.activePassageId,
  });

  const questionMutation = useQuestionMutation({
    passageId: state.activePassageId,
    passages: state.passages,
    setArtifacts: artifactQuery.setArtifacts,
    setError: (error) => setState((prev) => ({ ...prev, error })),
  });

  const layout = useStudyPanelLayout();

  return (
    <>
      {/* Three-panel workspace */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Group
          id="study-panels"
          orientation="horizontal"
          defaultLayout={layout.defaultLayout}
          onLayoutChanged={layout.onLayoutChanged}
          className="flex flex-1 h-full"
        >
          <Panel
            panelRef={layout.leftPanelRef}
            id="source"
            defaultSize="280px"
            minSize="200px"
            maxSize="800px"
            collapsedSize="60px"
            collapsible={true}
            onResize={layout.handleLeftResize}
          >
            <SourcesPanel
              documents={documents}
              activeId={state.activePassageId}
              onSelect={handleSelectDocument}
              onOpenUploadModal={handleOpenUploadModal}
              isUploading={isUploading}
              uploadingFileName={uploadingFileName}
              onDelete={handleDeletePassage}
              collapsed={layout.leftPanelCollapsed}
              onToggleCollapse={layout.toggleLeft}
              uploadError={state.uploadError}
              onClearUploadError={handleClearUploadError}
            />
          </Panel>

          <Separator
            disabled={layout.leftPanelCollapsed}
            className="w-1"
          />
          <Panel id="content" minSize={400}>
            <div className="h-full bg-surface flex flex-col overflow-hidden">
              <ContentPanel
                key={activePassage?.id ?? "empty"}
                passage={activePassage}
                onOpenUploadModal={handleOpenUploadModal}
              />
            </div>
          </Panel>

          <Separator
            disabled={layout.rightPanelCollapsed}
            className="w-1"
          />

          <Panel
            panelRef={layout.rightPanelRef}
            id="studio"
            defaultSize="280px"
            minSize="200px"
            collapsedSize="60px"
            collapsible={true}
            onResize={layout.handleRightResize}
          >
            <StudioPanel
              artifacts={artifactQuery.artifacts}
              view={artifactQuery.view}
              setView={artifactQuery.setView}
              artifactDetailById={artifactQuery.artifactDetailById}
              activePassage={activePassage}
              hasActivePassage={!!state.activePassageId}
              onActionClick={questionMutation.handleActionClick}
              collapsed={layout.rightPanelCollapsed}
              onToggleCollapse={layout.toggleRight}
              onRecordQuestionResult={questionMutation.handleRecordQuestionResult}
              onResetQuestionResult={questionMutation.handleResetQuestionResult}
            />
          </Panel>
        </Group>
      </div>

      {/* Upload modal */}
      <UploadModal
        isOpen={state.uploadModalOpen}
        onClose={handleCloseUploadModal}
        onUploadStart={handleUploadStart}
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
      />
    </>
  );
}
