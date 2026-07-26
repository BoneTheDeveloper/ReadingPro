"use client";

import { useState } from "react";
import { Type, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadSubmit } from "@/features/upload/hooks/use-upload-submit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextInputArea } from "@/features/upload/components/model/text-input-area";
import { UploadZone } from "@/features/upload/components/model/upload-zone";
import { YouTubeInput } from "@/features/upload/components/model/youtube-input";
import type { PassageData } from "@/types/passage";

export interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadStart?: (fileName: string, jobId: string, passageId: string) => void;
  onUploadComplete?: (data: { passage: PassageData; jobId: string }) => void;
  onUploadError?: (error: string, jobId?: string) => void;
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

export function UploadModal({ isOpen, onClose, onUploadStart, onUploadComplete, onUploadError }: UploadModalProps) {
  const [activeMode, setActiveMode] = useState<InputMode>(null);
  const { handleFileUpload, handleTextSubmit, handleYouTubeSubmit } = useUploadSubmit({ onUploadStart, onComplete: onUploadComplete, onError: onUploadError });

  const handleFileUploadWrapper = async (file: File) => {
    onClose();
    try {
      await handleFileUpload(file);
    } catch {}
  };

  const handleTextSubmitWrapper = async (text: string) => {
    if (!text.trim()) return;
    onClose();
    try {
      await handleTextSubmit(text);
    } catch {}
  };

  const handleYouTubeSubmitWrapper = async (url: string) => {
    if (!url.trim()) return;
    onClose();
    try {
      await handleYouTubeSubmit(url);
    } catch {}
  };

  const handleBack = () => { setActiveMode(null); };
  const handleClose = () => { setActiveMode(null); onClose(); };

  const handleModeChange = (next: InputMode) => {
    setActiveMode(next);
  };

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
              <UploadZone onFileSelect={handleFileUploadWrapper} variant="compact" />
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
              <TextInputArea onSubmit={handleTextSubmitWrapper} />
            </div>
          )}
          {activeMode === "youtube" && (
            <div className="flex flex-col gap-2">
              <Button variant="ghost" onClick={handleBack} className="text-primary text-sm w-fit h-auto py-1 px-2 -ml-2 hover:bg-accent/50">
                &larr; Quay lại nguồn
              </Button>
              <YouTubeInput onSubmit={handleYouTubeSubmitWrapper} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
