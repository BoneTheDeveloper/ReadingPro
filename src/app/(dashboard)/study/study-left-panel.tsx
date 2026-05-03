"use client";

import { Plus, FileText } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import type { DocumentItem } from "./study-types";

interface StudySourcesPanelProps {
  documents: DocumentItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAddNew: () => void;
}

export function StudySourcesPanel({
  documents,
  activeId,
  onSelect,
  onAddNew,
}: StudySourcesPanelProps) {
  return (
    <div className="w-[280px] bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col shrink-0">
      {/* Panel header */}
      <div className="p-4 border-b border-outline-variant/30">
        <h2 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-[0.05em]">
          Sources
        </h2>
      </div>

      {/* Document list */}
      <div className="p-6 flex-1 overflow-y-auto panel-scroll flex flex-col">
        <button
          onClick={onAddNew}
          className="w-full py-4 mb-6 bg-primary text-on-primary rounded-xl text-[14px] font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add New Document
        </button>

        {documents.length > 0 && (
          <>
            <h3 className="text-[20px] font-medium text-on-surface mb-4 truncate">
              Recent Documents
            </h3>
            <div className="flex flex-col gap-2">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onSelect(doc.id)}
                  className={cn(
                    "w-full p-4 text-left flex items-center gap-4 rounded-xl transition-colors border",
                    activeId === doc.id
                      ? "bg-surface-container-high border-outline-variant/30"
                      : "border-transparent hover:bg-surface-container-high hover:border-outline-variant/30",
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-[14px] font-semibold text-on-surface truncate">
                      {doc.title}
                    </h4>
                    <p className="text-[12px] text-on-surface-variant truncate">
                      {doc.date}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {documents.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[14px] text-on-surface-variant text-center">
              No documents yet.
              <br />
              Upload to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
