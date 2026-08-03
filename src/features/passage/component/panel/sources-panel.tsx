"use client";

import { DefaultSourceView } from "./default-source-view";
import { PassageErrorItem } from "./passage-error-item";
import { CollapsedSourcesPanel } from "./collapsed-sources-panel";
import type { PassageListItem } from "@/features/passage/schema";
import type { WorkspaceError } from "@/features/passage/hook/use-upload-flow";

interface SourcesPanelProps {
  items: PassageListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenUploadModal: () => void;
  onDelete: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse: () => void;
  /**
   * Workspace-level failures (create-passage, AI processing). Each renders
   * its own inline SourceErrorItem; the id keeps dismiss per-record.
   */
  errors?: WorkspaceError[];
  onDismissError?: (id: string) => void;
}

export function SourcesPanel({
  items,
  activeId,
  onSelect,
  onOpenUploadModal,
  onDelete,
  collapsed = false,
  onToggleCollapse,
  errors = [],
  onDismissError,
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
      {errors.map((err) => (
        <PassageErrorItem
          key={err.id}
          title={err.title}
          error={err.message}
          onDismiss={() => onDismissError?.(err.id)}
        />
      ))}
    </DefaultSourceView>
  );
}
