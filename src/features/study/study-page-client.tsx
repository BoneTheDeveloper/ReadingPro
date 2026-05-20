"use client";

import { Group, Panel, Separator } from "react-resizable-panels";
import type { PassageData } from "./study-types";
import { StudySourcesPanel } from "./study-left-panel";
import { StudyContentPanel } from "./study-content-panel";
import { StudyStudioPanel } from "./study-right-panel";
import { StudyUploadModal } from "./study-upload-modal";
import { useStudyActions } from "./use-study-actions";
import { useStudyPanelLayout } from "./use-study-panel-layout";
import { useStudyWorkspaceState } from "./use-study-workspace-state";

export function StudyPageClient({
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
  } = useStudyWorkspaceState(initialPassages);
  const { results, handleSimplify, handleActionClick } = useStudyActions({ state, setState });
  const layout = useStudyPanelLayout();

  return (
    <>
      {/* Sticky reading progress bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-muted z-50">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: "0%" }}
        />
      </div>

      {/* Three-panel workspace */}
      <div className="flex-1 min-h-0 overflow-hidden bg-muted px-2 pb-2 pt-16">
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
            collapsible={layout.leftCollapsible}
            collapsedSize="60px"
            defaultSize="280px"
            minSize="200px"
            maxSize="800px"
          >
            <StudySourcesPanel
              documents={documents}
              activeId={state.activePassageId}
              onSelect={handleSelectDocument}
              onOpenUploadModal={handleOpenUploadModal}
              isUploading={isUploading}
              uploadingFileName={uploadingFileName}
              onDelete={handleDeletePassage}
              collapsed={layout.leftPanelCollapsed}
              onToggleCollapse={layout.toggleLeft}
            />
          </Panel>

          <Separator
            disabled={layout.leftPanelCollapsed}
            className={`w-4 ${layout.leftPanelCollapsed ? "cursor-default! pointer-events-auto" : ""}`}
          />
          <Panel id="content" minSize={220}>
            <div className="h-full bg-background flex flex-col overflow-hidden rounded-xl border border-border">
              <div className="p-4 border-b border-border">
                <h2 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Content
                </h2>
              </div>
              <StudyContentPanel
                passage={activePassage}
                error={state.error}
                simplifying={state.simplifying}
                onSimplify={handleSimplify}
              />
            </div>
          </Panel>

          <Separator
            disabled={layout.rightPanelCollapsed}
            className={`w-4 ${layout.rightPanelCollapsed ? "cursor-default! pointer-events-auto" : ""}`}
          />

          <Panel
            panelRef={layout.rightPanelRef}
            id="studio"
            collapsible={layout.rightCollapsible}
            collapsedSize="60px"
            defaultSize="280px"
            minSize="200px"
          >
            <StudyStudioPanel
              results={results}
              activePassage={activePassage}
              hasActivePassage={!!state.activePassageId}
              simplifying={state.simplifying}
              onActionClick={handleActionClick}
              collapsed={layout.rightPanelCollapsed}
              onToggleCollapse={layout.toggleRight}
            />
          </Panel>
        </Group>
      </div>

      {/* Upload modal */}
      <StudyUploadModal
        isOpen={state.uploadModalOpen}
        onClose={handleCloseUploadModal}
        onUploadStart={handleUploadStart}
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
      />
    </>
  );
}
