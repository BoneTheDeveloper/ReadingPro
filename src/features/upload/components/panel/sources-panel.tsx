"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  FileText,
  Search,
  MoreVertical,
  Trash2,
  PanelLeft,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SourceType } from "@/types/passage";

export interface DocumentItem {
  id: string;
  title: string;
  date: string;
  level: string | null;
  wordCount: number;
  sourceType: SourceType;
  status?: "processing" | "ready";
}

interface SourcesPanelProps {
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

export function SourcesPanel({
  documents, activeId, onSelect, onOpenUploadModal, isUploading, onDelete, collapsed = false, onToggleCollapse,
}: SourcesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDocs = useMemo(
    () => documents.filter((doc) => doc.title.toLowerCase().includes(searchQuery.toLowerCase())),
    [documents, searchQuery],
  );

  if (collapsed) {
    return (
      <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
        <CardContent className="p-0 flex flex-col h-full items-center">
          <div className="w-full p-2 flex justify-center border-b border-border">
            <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Mở rộng bảng">
              <PanelLeft className="w-5 h-5" />
            </Button>
          </div>
          <div className="w-full px-2 pt-2 pb-1 flex justify-center">
            <Button variant="ghost" size="icon" onClick={onOpenUploadModal} className="h-9 w-9 text-muted-foreground hover:text-foreground" title="Thêm nguồn">
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto panel-scroll w-full px-2 py-1">
            <div className="flex flex-col items-center gap-1">
              {documents.map((doc) => {
                const isActive = activeId === doc.id;
                const isYoutube = doc.sourceType === "YOUTUBE";
                const DocIcon = isYoutube ? Video : FileText;
                return (
                  <button key={doc.id} onClick={() => onSelect(doc.id)} title={doc.title}
                    className={cn("w-11 h-11 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                      isActive ? "bg-primary/10 text-primary" : "text-ink-3 hover:bg-primary/10 hover:text-primary"
                    )}>
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

  return (
    <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
      <CardContent className="p-0 flex flex-col h-full">
        <div className="h-[54px] px-4 flex items-center justify-between border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nguồn</h2>
          <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="h-[30px] w-[30px] rounded-[9px] text-muted-foreground hover:text-primary" title="Thu gọn bảng" aria-label="Thu gọn bảng">
            <PanelLeft className="w-4 h-4" />
          </Button>
        </div>
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nguồn..."
              className="pl-9 h-9 bg-paper border-border text-[13px]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto panel-scroll px-2.5 pb-3">
          <div className="flex flex-col gap-[3px]">
            <button type="button" onClick={onOpenUploadModal}
              className="w-full mb-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[13px] border-[1.5px] border-dashed border-border-strong text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary hover:bg-surface transition-all disabled:opacity-50">
              <Plus className="w-3.5 h-3.5" />
              Thêm nguồn
            </button>
            {filteredDocs.map((doc) =>
              doc.status === "processing" ? (
                <ProcessingRow key={doc.id} title={doc.title} onSelect={() => onSelect(doc.id)} />
              ) : (
                <SourceRow key={doc.id} doc={doc} active={activeId === doc.id} onSelect={() => onSelect(doc.id)} onDelete={() => onDelete(doc.id)} />
              )
            )}
            {!isUploading && filteredDocs.length === 0 && documents.length > 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Không có nguồn phù hợp</p>
            )}
            {!isUploading && documents.length === 0 && (
              <p className="text-[13px] text-muted-foreground text-center py-8">
                Chưa có nguồn nào.<br />Thêm một nguồn để bắt đầu.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProcessingRow({ title, onSelect }: { title: string; onSelect: () => void }) {
  return (
    <div className="w-full p-2.5 flex items-center gap-2.5 rounded-[13px] border border-transparent relative overflow-hidden cursor-not-allowed opacity-70">
      <div className="absolute inset-0 z-0 bg-accent animate-[upload-fill_2.8s_ease-in-out_forwards]">
        <div className="absolute inset-y-0 w-16 right-0 bg-linear-to-r from-transparent via-white/55 to-transparent animate-[upload-shimmer_1.4s_ease-in-out_infinite]" />
      </div>
      <div className="relative z-10 w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 bg-accent text-primary">
        <FileText className="w-4 h-4" />
      </div>
      <div className="relative z-10 flex-1 overflow-hidden">
        <h4 className="text-[13px] font-medium truncate leading-tight text-foreground">{title}</h4>
        <p className="text-[11px] truncate mt-0.5 text-muted-foreground">Đang xử lý...</p>
      </div>
    </div>
  );
}

function SourceRow({ doc, active, onSelect, onDelete }: {
  doc: DocumentItem; active: boolean; onSelect: () => void; onDelete: () => void;
}) {
  const isYoutube = doc.sourceType === "YOUTUBE";
  const DocIcon = isYoutube ? Video : FileText;

  return (
    <div role="button" tabIndex={0} onClick={onSelect} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(); }}
      className={cn("w-full p-2.5 text-left flex items-center gap-2.5 rounded-[13px] transition-colors border group cursor-pointer",
        active ? "bg-primary/10 border-primary/20" : "border-transparent hover:bg-surface hover:border-border"
      )}>
      <div className={cn("w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0",
        active ? "bg-surface text-primary shadow-sm" : "bg-indigo-soft text-ink-3"
      )}>
        <DocIcon className="w-4 h-4" />
      </div>
      <div className="flex-1 overflow-hidden">
        <h4 className={cn("text-[13px] truncate leading-tight", active ? "font-semibold text-primary" : "font-medium text-foreground")}>{doc.title}</h4>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{doc.date}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button onClick={(e) => e.stopPropagation()} className="shrink-0 p-1 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100" aria-label="Tùy chọn">
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="min-w-40">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive focus:text-destructive font-medium">
            <Trash2 className="w-4 h-4 mr-2" />
            Xóa nguồn
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
