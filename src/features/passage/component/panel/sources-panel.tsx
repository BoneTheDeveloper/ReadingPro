"use client";

import { DefaultSourceView, SourceErrorItem } from "./default-source-view";
import { CollapsedSourcesPanel } from "./collapsed-sources-panel";
import type { PassageListItem } from "@/features/passage/schema";

interface SourcesPanelProps {
  items: PassageListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenUploadModal: () => void;
  onDelete: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse: () => void;
  // Pre-submit client validation errors (file too short, bad youtube URL).
  // Rendered above the source list and dismissible. Server-side errors
  // (FAILED rows) are rendered inline as part of `items`.
  clientError?: string | null;
  onClearClientError?: () => void;
}

export function SourcesPanel({
  items,
  activeId,
  onSelect,
  onOpenUploadModal,
  onDelete,
  collapsed = false,
  onToggleCollapse,
  clientError,
  onClearClientError,
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
      {clientError && (
        <SourceErrorItem
          error={clientError}
          onDismiss={onClearClientError ?? (() => {})}
        />
      )}
    </DefaultSourceView>
  );
}
