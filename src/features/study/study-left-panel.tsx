"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  FileText,
  Search,
  CheckSquare,
  Square,
  MoreVertical,
  Trash2,
  Pencil,
  PanelLeft,
  Video,
} from "lucide-react";
import { cn } from "@/lib/shared/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DocumentItem } from "./study-types";

interface StudySourcesPanelProps {
  documents: DocumentItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenUploadModal: () => void;
  isUploading?: boolean;
  uploadingFileName?: string;
  onDelete: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse: () => void;
}

export function StudySourcesPanel({
  documents,
  activeId,
  onSelect,
  onOpenUploadModal,
  isUploading,
  uploadingFileName,
  onDelete,
  collapsed = false,
  onToggleCollapse,
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
    setSelectedIds(
      allSelected ? new Set() : new Set(filteredDocs.map((d) => d.id)),
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Collapsed mode: icon-only strip
  if (collapsed) {
    return (
      <Card className="h-full flex flex-col overflow-hidden">
        <CardContent className="p-0 flex flex-col h-full items-center">
          {/* Collapse toggle */}
          <div className="w-full p-2 flex justify-center border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <PanelLeft className="w-5 h-5" />
            </Button>
          </div>

          {/* Add source icon */}
          <div className="w-full px-2 pt-2 pb-1 flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenUploadModal}
              disabled={isUploading}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          {/* Icon-only document list */}
          <div className="flex-1 overflow-y-auto panel-scroll w-full px-2 py-1">
            <div className="flex flex-col items-center gap-1">
              {documents.map((doc) => {
                const isActive = activeId === doc.id;
                const isYoutube = doc.sourceType === "YOUTUBE";
                const DocIcon = isYoutube ? Video : FileText;
                return (
                  <button
                    key={doc.id}
                    onClick={() => onSelect(doc.id)}
                    title={doc.title}
                    className={cn(
                      "w-11 h-11 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                      isActive && isYoutube
                        ? "bg-red-500/10 text-red-500"
                        : isActive
                          ? "bg-primary/10 text-primary"
                          : isYoutube
                            ? "text-red-400 hover:bg-red-500/10 hover:text-red-500"
                            : "text-blue-400 hover:bg-primary/10 hover:text-primary",
                    )}
                  >
                    <DocIcon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Expanded mode
  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Panel header */}
        <div className="p-4 flex items-center justify-between border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Sources
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <PanelLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Search bar */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sources..."
              className="pl-9 h-9 bg-muted border-0 text-[13px]"
            />
          </div>
        </div>

        {/* Add source button */}
        <div className="px-4 pb-3">
          <Button
            onClick={onOpenUploadModal}
            disabled={isUploading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            size="sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Source
          </Button>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto panel-scroll px-3 pb-4">
          {filteredDocs.length > 0 && (
            <Button
              variant="ghost"
              onClick={toggleSelectAll}
              className="w-full px-3 py-2 mb-1 h-auto text-[12px] text-muted-foreground justify-start gap-2.5"
              size="sm"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Select all
            </Button>
          )}

          <div className="flex flex-col gap-1">
            {/* Streaming upload indicator */}
            {isUploading && (
              <div className="w-full p-3 flex items-center gap-3 rounded-xl border border-border bg-background relative overflow-hidden">
                <div className="absolute inset-0 z-0 bg-accent animate-[upload-fill_2.8s_ease-in-out_forwards]">
                  <div className="absolute inset-y-0 w-16 right-0 bg-linear-to-r from-transparent via-white/55 to-transparent animate-[upload-shimmer_1.4s_ease-in-out_infinite]" />
                </div>
                <div className="relative z-10 shrink-0">
                  <Square className="w-4 h-4 text-border" />
                </div>
                <div className="relative z-10 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-accent text-primary">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="relative z-10 flex-1 overflow-hidden">
                  <h4 className="text-[13px] font-medium truncate leading-tight text-foreground">
                    {uploadingFileName ?? "Processing..."}
                  </h4>
                  <p className="text-[11px] truncate mt-0.5 text-muted-foreground">
                    Analyzing content...
                  </p>
                </div>
              </div>
            )}

            {filteredDocs.map((doc) => {
              const isSelected = selectedIds.has(doc.id);
              const isActive = activeId === doc.id;
              const isYoutube = doc.sourceType === "YOUTUBE";
              const DocIcon = isYoutube ? Video : FileText;
              return (
                <div
                  key={doc.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(doc.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onSelect(doc.id);
                  }}
                  className={cn(
                    "w-full p-3 text-left flex items-center gap-3 rounded-xl transition-colors border group cursor-pointer",
                    isActive
                      ? "bg-primary/10 border-primary/20"
                      : "border-transparent hover:bg-muted hover:border-border",
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      isActive && isYoutube
                        ? "bg-red-500/10 text-red-500"
                        : isActive
                          ? "bg-primary/10 text-primary"
                          : isYoutube
                            ? "bg-red-500/5 text-red-400"
                            : "bg-blue-500/5 text-blue-400",
                    )}
                  >
                    <DocIcon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-[13px] font-medium text-foreground truncate leading-tight">
                      {doc.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {doc.date}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 p-1 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="right"
                      align="end"
                      className="min-w-40"
                    >
                      <DropdownMenuItem disabled className="opacity-60">
                        <Pencil className="w-4 h-4 mr-2" />
                        Rename source
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(doc.id);
                        }}
                        className="text-destructive focus:text-destructive font-medium"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete source
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

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
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5 text-white border border-muted-foreground/30 rounded-sm" />
                    )}
                  </div>
                </div>
              );
            })}

            {!isUploading &&
              filteredDocs.length === 0 &&
              documents.length > 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No matching sources
                </p>
              )}

            {!isUploading && documents.length === 0 && (
              <div className="flex-1 flex items-center justify-center py-8">
                <p className="text-[13px] text-muted-foreground text-center">
                  No sources yet.
                  <br />
                  Add a source to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
