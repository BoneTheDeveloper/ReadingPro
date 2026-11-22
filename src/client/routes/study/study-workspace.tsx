"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Group, Panel, Separator } from "react-resizable-panels";
import { SourcesPanel, UploadModal, usePassageLibrary, passageQueries, useUploadFlow } from "@/client/features/passage";
import { ContentPanel } from "@/client/features/reading";
import { StudioPanel, type StudioPanelView, type WordLookupRequest } from "@/client/features/studio";
import { useStudyPanelLayout } from "./use-study-panel-layout";

import type { RefObject } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";


const STUDIO_VIEW_SIZE = {
  chat: 400,
  question: 500,
  flashcard: 500,
  lookup: 420,
} as const satisfies Record<NonNullable<StudioPanelView>["contentType"], number>;

/** An open studio view belongs to the passage it was opened from. */
type StudioViewState = { passageId: string | null; view: StudioPanelView };

/** Widens the studio panel to fit the open view. */
function useFitStudioToView(view: StudioPanelView, panelRef: RefObject<PanelImperativeHandle | null>) {
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

  // Lifted here so the reading panel can open a studio view. Derived, not
  // reset by an effect: switching passages closes whatever view was open.
  const [studio, setStudio] = useState<StudioViewState>({ passageId: null, view: null });
  const studioView = studio.passageId === library.activeId ? studio.view : null;
  const setStudioView = useCallback(
    (view: StudioPanelView) => setStudio({ passageId: library.activeId, view }),
    [library.activeId],
  );
  useFitStudioToView(studioView, layout.rightPanelRef);

  const { expandRight } = layout;
  const openLookup = useCallback(
    (request: WordLookupRequest) => {
      expandRight();
      setStudioView({ contentType: "lookup", request });
    },
    [expandRight, setStudioView],
  );

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
                // `isPending` stays true for a skipToken-disabled query, so the
                // empty state would never render. `isLoading` = pending + fetching.
                isLoading={detail.isLoading}
                error={detail.error}
                onOpenUploadModal={upload.openModal}
                onLookup={openLookup}
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
              // Remounts per passage so in-flight generation state never leaks into another passage.
              key={contentKey}
              passageId={library.activeId}
              collapsed={layout.rightPanelCollapsed}
              onToggleCollapse={layout.toggleRight}
              view={studioView}
              onViewChange={setStudioView}
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
