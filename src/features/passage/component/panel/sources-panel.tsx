"use client";

import { DefaultSourceView, SourceProcessingItem, SourceErrorItem } from "./default-source-view";
import { CollapsedSourcesPanel } from "./collapsed-sources-panel";
import type { PassageListItem } from "@/features/passage/schema";

interface SourcesPanelProps {
  items: PassageListItem[];
  pendingUpload?: { title: string } | null;
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenUploadModal: () => void;
  onDelete: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse: () => void;
  uploadError?: string | null;
  onClearUploadError?: () => void;
}

export function SourcesPanel({
  items,
  pendingUpload = null,
  activeId,
  onSelect,
  onOpenUploadModal,
  onDelete,
  collapsed = false,
  onToggleCollapse,
  uploadError,
  onClearUploadError,
}: SourcesPanelProps) {
  if (collapsed) {
    return (
      <CollapsedSourcesPanel
        items={items}
        activeId={activeId}
        onSelect={onSelect}
        onOpenUploadModal={onOpenUploadModal}
        onToggleCollapse={onToggleCollapse}
      />
    );
  }

  return (
    <DefaultSourceView
      items={items}
      activeId={activeId}
      onSelect={onSelect}
      onDelete={onDelete}
      onOpenUploadModal={onOpenUploadModal}
      onToggleCollapse={onToggleCollapse}
    >
      {uploadError && (
        <SourceErrorItem
          error={uploadError}
          onDismiss={onClearUploadError ?? (() => {})}
        />
      )}
      {pendingUpload && <SourceProcessingItem title={pendingUpload.title} />}
    </DefaultSourceView>
  );
}
