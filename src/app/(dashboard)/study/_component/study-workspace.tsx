"use client";

import { Group, Panel, Separator } from "react-resizable-panels";
import { SourcesPanel } from "@/features/passage/component/panel/sources-panel";
import { ContentPanel } from "@/features/reading/component/content-panel";
import { StudioPanel } from "@/features/studio/component/panel/studio-panel";
import { UploadModal } from "@/features/passage/component/model/upload-modal";
import { usePassageLibrary } from "@/features/passage/hook/use-passage-library";
import { usePassage } from "@/features/passage/queries";
import { useUploadFlow } from "@/features/passage/hook/use-upload-flow";
import { useStudyPanelLayout } from "../_hook/use-study-panel-layout";

export function StudyWorkspace() {
  const library = usePassageLibrary();
  const detail = usePassage(library.activeId);
  const upload = useUploadFlow(library.upsert);
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
              items={library.passages}
              activeId={library.activeId}
              onSelect={library.select}
              onOpenUploadModal={upload.openModal}
              pendingUpload={
                upload.uploadingFileName
                  ? { title: upload.uploadingFileName }
                  : null
              }
              onDelete={library.remove}
              collapsed={layout.leftPanelCollapsed}
              onToggleCollapse={layout.toggleLeft}
              uploadError={upload.error}
              onClearUploadError={upload.clearError}
            />
          </Panel>

          <Separator disabled={layout.leftPanelCollapsed} className="w-1" />

          <Panel id="content" minSize={400}>
            <div className="h-full bg-surface flex flex-col overflow-hidden">
              <ContentPanel
                key={library.activeId ?? "empty"}
                passage={detail.data ?? null}
                isLoading={detail.isPending}
                onOpenUploadModal={upload.openModal}
              />
            </div>
          </Panel>

          <Separator disabled={layout.rightPanelCollapsed} className="w-1" />

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
              passageId={library.activeId}
              collapsed={layout.rightPanelCollapsed}
              onToggleCollapse={layout.toggleRight}
            />
          </Panel>
        </Group>
      </div>

      {/* Upload modal */}
      <UploadModal
        isOpen={upload.isModalOpen}
        onClose={upload.closeModal}
        onUploadStart={upload.start}
        onUploadComplete={upload.complete}
        onUploadError={upload.fail}
      />
    </>
  );
}
