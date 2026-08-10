"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Group, Panel, Separator } from "react-resizable-panels";
import { SourcesPanel } from "@/features/passage/component/panel/sources-panel";
import { ContentPanel } from "@/features/reading/component/content-panel";
import { StudioPanel } from "@/features/studio/component/panel/studio-panel";
import { UploadModal } from "@/features/passage/component/model/upload-modal";
import { usePassageLibrary } from "@/features/passage/hook/use-passage-library";
import { passageQueries } from "@/features/passage/api/queries";
import { useUploadFlow } from "@/features/passage/hook/use-upload-flow";
import { useStudyPanelLayout } from "../_hook/use-study-panel-layout";

import type { RefObject } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import type { StudioPanelView } from "@/features/studio/component/panel/studio-icon-list";


const STUDIO_VIEW_SIZE = {
  chat: 400,
  question: 500,
  flashcard: 500,
} as const satisfies Record<NonNullable<StudioPanelView>["contentType"], number>;

interface StudioSlotProps {
  passageId: string | null;
  panelRef: RefObject<PanelImperativeHandle | null>;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * Owns the studio's `view` state. Mounted with a passage-derived key so the
 * open view resets on passage change without a reset effect — an artifact view
 * is only meaningful for the passage it was opened from.
 */
function StudioSlot({
  passageId,
  panelRef,
  collapsed,
  onToggleCollapse,
}: StudioSlotProps) {
  const [view, setView] = useState<StudioPanelView>(null);

  // Syncs with the panel's imperative handle (outside React), so it belongs in
  // an effect: the size can only be read after the layout has committed.
  useEffect(() => {
    if (!view) return;

    const panel = panelRef.current;
    if (!panel || panel.isCollapsed()) return;

    const target = STUDIO_VIEW_SIZE[view.contentType];
    if (panel.getSize().inPixels < target) {
      panel.resize(`${target}px`);
    }
  }, [view, panelRef]);

  return (
    <StudioPanel
      passageId={passageId}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      view={view}
      onViewChange={setView}
    />
  );
}

export function StudyWorkspace() {
  const { data: passages = [] } = useQuery(passageQueries.list());
  const library = usePassageLibrary();
  const upload = useUploadFlow();
  const layout = useStudyPanelLayout();

  // `activeId` is already resolved against the list and guaranteed COMPLETED,
  // so PENDING/FAILED rows stay visible in the source list without ever
  // driving detail or artifact generation.
  const detail = useQuery(passageQueries.detail(library.activeId));
  const contentKey = library.activeId ?? "empty";

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
              items={passages}
              activeId={library.activeId}
              onSelect={library.select}
              onOpenUploadModal={upload.openModal}
              onDelete={library.remove}
              collapsed={layout.leftPanelCollapsed}
              onToggleCollapse={layout.toggleLeft}
              errors={upload.errors}
              onDismissError={upload.dismissError}
            />
          </Panel>

          <Separator disabled={layout.leftPanelCollapsed} className="w-1" />

          <Panel id="content" minSize="400px">
            <div className="h-full bg-surface flex flex-col overflow-hidden">
              <ContentPanel
                key={contentKey}
                passage={detail.data ?? null}
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
            <StudioSlot
              key={contentKey}
              passageId={library.activeId}
              panelRef={layout.rightPanelRef}
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
        onClientError={(title, message) => upload.addError("upload", title, message)}
      />
    </>
  );
}
