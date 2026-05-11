"use client";

import { useState, useMemo } from "react";
import { Plus, FileText, Search, CheckSquare, Square, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { DocumentItem } from "./study-types";

interface StudySourcesPanelProps {
  documents: DocumentItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenUploadModal: () => void;
  isUploading?: boolean;
  uploadingFileName?: string;
  onDelete: (id: string) => void;
}

export function StudySourcesPanel({
  documents,
  activeId,
  onSelect,
  onOpenUploadModal,
  isUploading,
  uploadingFileName,
  onDelete,
}: StudySourcesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredDocs = useMemo(
    () =>
      documents.filter((doc) =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [documents, searchQuery],
  );

  const allSelected =
    filteredDocs.length > 0 && filteredDocs.every((d) => selectedIds.has(d.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocs.map((d) => d.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden border border-[#e5e7eb]"
      style={{ background: "#ffffff", borderRadius: "12px" }}
    >
      {/* Panel header */}
      <div
        className="p-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid #e5e7eb" }}
      >
        <h2 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider">
          Sources
        </h2>
        {documents.length > 0 && (
          <span className="text-[11px] text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full">
            {documents.length}
          </span>
        )}
      </div>

      {/* Search bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sources..."
            className="w-full pl-9 pr-3 py-2 bg-surface-container-high rounded-lg text-[13px] text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Add source button */}
      <div className="px-4 pb-3">
        <button
          onClick={onOpenUploadModal}
          disabled={isUploading}
          className="w-full py-2.5 bg-primary text-on-primary rounded-lg text-[13px] font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm disabled:opacity-60"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Source
        </button>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto panel-scroll px-3 pb-4">
        {/* Select all */}
        {filteredDocs.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="w-full px-3 py-2 mb-1 flex items-center gap-2.5 rounded-lg text-[12px] text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            Select all
          </button>
        )}

        <div className="flex flex-col gap-1">
          {/* Streaming upload button — matches document item layout */}
          {isUploading && (
            <div
              className="w-full p-3 flex items-center gap-3 rounded-xl border relative overflow-hidden"
              style={{
                borderColor: "#B5D4F4",
                backgroundColor: "#ffffff",
              }}
            >
              {/* Fill layer — z-0 */}
              <div
                className="absolute inset-0 z-0"
                style={{
                  backgroundColor: "#E6F1FB",
                  animation: "upload-fill 2.8s ease-in-out forwards",
                }}
              >
                {/* Shimmer wave riding the leading edge */}
                <div
                  className="absolute inset-y-0 w-16"
                  style={{
                    right: 0,
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
                    animation: "upload-shimmer 1.4s ease-in-out infinite",
                  }}
                />
              </div>

              {/* Content — z-10 */}
              <div className="relative z-10 shrink-0">
                <Square className="w-4 h-4" style={{ color: "#B5D4F4" }} />
              </div>

              <div
                className="relative z-10 w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: "#E6F1FB",
                  color: "#378ADD",
                }}
              >
                <FileText className="w-4 h-4" />
              </div>

              <div className="relative z-10 flex-1 overflow-hidden">
                <h4
                  className="text-[13px] font-medium truncate leading-tight"
                  style={{ color: "#0a1a2e" }}
                >
                  {uploadingFileName ?? "Processing..."}
                </h4>
                <p
                  className="text-[11px] truncate mt-0.5"
                  style={{ color: "#6b7b8d" }}
                >
                  Analyzing content...
                </p>
              </div>
            </div>
          )}

          {filteredDocs.map((doc) => {
            const isSelected = selectedIds.has(doc.id);
            const isActive = activeId === doc.id;
            return (
              <div
                key={doc.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(doc.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(doc.id); }}
                className={cn(
                  "w-full p-3 text-left flex items-center gap-3 rounded-xl transition-colors border group cursor-pointer",
                  isActive
                    ? "bg-primary/8 border-primary/20"
                    : "border-transparent hover:bg-surface-container-high hover:border-outline-variant/20",
                )}
              >
                {/* Checkbox */}
                <div
                  role="checkbox"
                  aria-checked={isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(doc.id);
                  }}
                  className="shrink-0 cursor-pointer"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <Square className="w-4 h-4 text-on-surface-variant/50 group-hover:text-on-surface-variant" />
                  )}
                </div>

                {/* Source icon */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-surface-container text-on-surface-variant",
                  )}
                >
                  <FileText className="w-4 h-4" />
                </div>

                {/* Document info */}
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-[13px] font-medium text-on-surface truncate leading-tight">
                    {doc.title}
                  </h4>
                  <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                    {doc.date}
                  </p>
                </div>

                {/* Kebab menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 p-1 rounded-lg text-on-surface-variant/40 hover:text-on-surface hover:bg-surface-container-high transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(doc.id);
                      }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete source
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                      <Pencil className="w-4 h-4" />
                      Rename source
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}

          {!isUploading &&
            filteredDocs.length === 0 &&
            documents.length > 0 && (
              <p className="text-[12px] text-on-surface-variant text-center py-4">
                No matching sources
              </p>
            )}

          {!isUploading && documents.length === 0 && (
            <div className="flex-1 flex items-center justify-center py-8">
              <p className="text-[13px] text-on-surface-variant text-center">
                No sources yet.
                <br />
                Add a source to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
