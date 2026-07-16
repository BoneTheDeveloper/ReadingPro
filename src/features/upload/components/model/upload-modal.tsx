"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Upload, Type, Globe, Search, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadSubmit } from "@/features/upload/hooks/use-upload-submit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextInputArea } from "@/features/upload/components/model/text-input-area";
import { UploadZone } from "@/features/upload/components/model/upload-zone";
import type { PassageData } from "@/types/passage";

export interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadStart?: (fileName: string, jobId: string, passageId: string) => void;
  onUploadComplete?: (data: { passage: PassageData; jobId: string }) => void;
  onUploadError?: (error: string, jobId?: string) => void;
}

type InputMode = "file" | "text" | null;

function SourceButton({
  icon: Icon,
  label,
  desc,
  onClick,
  disabled,
}: {
  icon: typeof Upload;
  label: string;
  desc?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="h-auto p-4 flex items-center gap-3 justify-start hover:bg-accent"
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-accent border border-border">
        <Icon
          className={cn(
            "w-4 h-4",
            disabled ? "text-muted-foreground" : "text-primary",
          )}
        />
      </div>
      <div className="text-left">
        <p
          className={cn(
            "text-sm font-semibold",
            disabled ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {label}
        </p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
    </Button>
  );
}

export function UploadModal({
  isOpen,
  onClose,
  onUploadStart,
  onUploadComplete,
  onUploadError,
}: UploadModalProps) {
  const t = useTranslations("Study");
  const [activeMode, setActiveMode] = useState<InputMode>(null);
  const [error, setError] = useState<string | null>(null);
  const { isProcessing, handleFileUpload, handleTextSubmit } =
    useUploadSubmit({ onUploadStart, onComplete: onUploadComplete, onError: onUploadError });

  const handleFileUploadWrapper = async (file: File) => {
    if (isProcessing) return; // Prevent double-submit
    setError(null);
    onClose(); // Close modal immediately when upload starts
    try {
      await handleFileUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("uploadFailed"));
    }
  };

  const handleTextSubmitWrapper = async (text: string) => {
    if (!text.trim() || isProcessing) return;
    setError(null);
    onClose(); // Close modal immediately when upload starts
    try {
      await handleTextSubmit(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("uploadFailed"));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-5 pb-4">
          <DialogTitle>{t("addSourceTitle")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("uploadOrPasteContent")}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("searchSourcesWeb")}
              className="pl-10 bg-accent"
            />
          </div>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {activeMode === null && (
            <>
              <UploadZone
                onFileSelect={handleFileUploadWrapper}
                isProcessing={isProcessing}
                variant="compact"
              />

              <div className="grid grid-cols-2 gap-3 mt-5">
                <SourceButton
                  icon={Upload}
                  label={t("uploadFile")}
                  onClick={() => setActiveMode("file")}
                />
                <SourceButton
                  icon={Globe}
                  label={t("website")}
                  desc={t("comingSoon")}
                  disabled
                />
                <SourceButton
                  icon={FileText}
                  label={t("googleDrive")}
                  desc={t("comingSoon")}
                  disabled
                />
                <SourceButton
                  icon={Type}
                  label={t("pasteText")}
                  onClick={() => setActiveMode("text")}
                />
              </div>
            </>
          )}

          {activeMode === "file" && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveMode(null)}
                className="text-primary mb-3 -ml-2"
              >
                &larr; {t("backToSources")}
              </Button>
              <UploadZone
                onFileSelect={handleFileUploadWrapper}
                isProcessing={isProcessing}
                variant="expanded"
              />
            </div>
          )}

          {activeMode === "text" && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveMode(null)}
                className="text-primary mb-3 -ml-2"
              >
                &larr; {t("backToSources")}
              </Button>
              <TextInputArea
                onSubmit={handleTextSubmitWrapper}
                isProcessing={isProcessing}
              />
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-danger-soft border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end">
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
