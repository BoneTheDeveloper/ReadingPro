"use client";

import { useState } from "react";
import { Type, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreatePassage } from "@/features/passage/api/mutations";
import { extractPdfText } from "@/features/passage/util/pdf-parser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/component/ui/dialog";
import { Button } from "@/component/ui/button";
import { TextInputArea } from "@/features/passage/component/model/paste-text-input-area";
import { UploadZone } from "@/features/passage/component/model/upload-zone";
import { YouTubeInput } from "@/features/passage/component/model/youtube-input";
import type { Passage, CreatePassageInput } from "@/features/passage/schema";

export interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Called on successful POST. The workspace uses this to select the new
  // passage and close the modal. The server-side row already exists at this
  // point (status: PENDING) — the polling query picks it up.
  onCreated?: (passage: Passage) => void;
  // Client-side validation errors before submission (file too short, bad
  // youtube URL, etc.) are surfaced here so the workspace can render them
  // above the source list. Server-side errors stay on the row.
  onClientError?: (title: string, message: string) => void;
}

type InputMode = "file" | "paste-text" | "youtube" | null;

function SourceButton({ icon: Icon, label, desc, onClick, disabled }: {
  icon: React.ElementType; label: string; desc?: string; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <Button variant="outline" onClick={onClick} disabled={disabled} className="h-auto p-4 flex items-center gap-3 justify-start hover:bg-accent">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-accent border border-border">
        <Icon className={cn("w-4 h-4", disabled ? "text-muted-foreground" : "text-primary")} />
      </div>
      <div className="text-left">
        <p className={cn("text-sm font-semibold", disabled ? "text-muted-foreground" : "text-foreground")}>{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
    </Button>
  );
}

export function UploadModal({ isOpen, onClose, onCreated, onClientError }: UploadModalProps) {
  const [activeMode, setActiveMode] = useState<InputMode>(null);
  const mutation = useCreatePassage();

  const submit = (input: CreatePassageInput) => {
    mutation.mutate(input, {
      onSuccess: (passage) => {
        onCreated?.(passage);
      },
      onError: (err) => {
        onClientError?.("Tải lên thất bại", err.message);
        onClose?.();
      },
    });
  };

  const handlePdfSelect = async (file: File) => {
    const title = file.name.replace(/\.pdf$/i, "");
    submit({ sourceType: "PDF", title, text: await extractPdfText(file) });
  };

  const handleTxtSelect = async (file: File) => {
    const title = file.name.replace(/\.txt$/i, "");
    submit({ sourceType: "TEXT", title, text: await file.text() });
  };

  const handleTextSubmit = (text: string) => {
    if (!text.trim()) return;
    submit({ sourceType: "TEXT", title: "Pasted Text", text });
  };

  const handleYouTubeSubmit = async (url: string) => {
    if (!url.trim()) return;
    submit({ sourceType: "YOUTUBE", title: "YouTube Video", youtubeUrl: url });
  };

  const handleBack = () => setActiveMode(null);
  const handleClose = () => { setActiveMode(null); onClose(); };
  const handleModeChange = (next: InputMode) => setActiveMode(next);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent showCloseButton={false} className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-5 pb-2 relative">
          <DialogTitle>Thêm nguồn</DialogTitle>
          <button onClick={handleClose} className="absolute right-5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full hover:bg-accent transition-colors" aria-label="Đóng">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </DialogHeader>
        <div className="px-5 pb-5 pt-1 flex-1 overflow-y-auto">
          {activeMode === null && (
            <>
              <UploadZone onTxtSelect={handleTxtSelect} onPdfSelect={handlePdfSelect} variant="compact" />
              <div className="grid grid-cols-2 gap-3 mt-5">
                <SourceButton icon={PlayCircle} label="YouTube" onClick={() => handleModeChange("youtube")} />
                <SourceButton icon={Type} label="Dán văn bản" onClick={() => handleModeChange("paste-text")} />
              </div>
            </>
          )}
          {activeMode === "paste-text" && (
            <div className="flex flex-col gap-2">
              <Button variant="ghost" onClick={handleBack} className="text-primary text-sm w-fit h-auto py-1 px-2 -ml-2 hover:bg-accent/50">
                &larr; Quay lại nguồn
              </Button>
              <TextInputArea onSubmit={handleTextSubmit} />
            </div>
          )}
          {activeMode === "youtube" && (
            <div className="flex flex-col gap-2">
              <Button variant="ghost" onClick={handleBack} className="text-primary text-sm w-fit h-auto py-1 px-2 -ml-2 hover:bg-accent/50">
                &larr; Quay lại nguồn
              </Button>
              <YouTubeInput onSubmit={handleYouTubeSubmit} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
