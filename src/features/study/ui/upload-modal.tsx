"use client"

import { useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Upload, Type, Globe, Search, FileText } from "lucide-react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { validateFile, formatFileSize } from "@/lib/validation/upload"
import { cn } from "@/lib/shared/utils"
import { studyUploadAction } from "@/features/study/actions/study-upload-action"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { StudyUploadModalProps } from "@/features/study/model/types"

type InputMode = "file" | "text" | null

function SourceButton({ icon: Icon, label, desc, onClick, disabled }: {
  icon: typeof Upload
  label: string
  desc: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="h-auto p-4 flex items-center gap-3 justify-start hover:bg-accent"
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-accent border border-border">
        <Icon className={cn("w-4 h-4", disabled ? "text-muted-foreground" : "text-primary")} />
      </div>
      <div className="text-left">
        <p className={cn("text-sm font-semibold", disabled ? "text-muted-foreground" : "text-foreground")}>{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </Button>
  )
}

export function StudyUploadModal({
  isOpen,
  onClose,
  onUploadStart,
  onUploadComplete,
  onUploadError,
}: StudyUploadModalProps) {
  const t = useTranslations("Study")
  const [activeMode, setActiveMode] = useState<InputMode>(null)
  const [error, setError] = useState<string | null>(null)
  const [pastedText, setPastedText] = useState("")

  const handleFileUpload = async (file: File) => {
    const fileName = file.name.replace(/\.(txt|pdf)$/, "")
    const fileType = file.name.endsWith(".pdf") ? "PDF" : "TEXT"
    onUploadStart(fileName)
    onClose()
    setError(null)
    try {
      const text = await file.text()
      const result = await studyUploadAction({ text, title: fileName, sourceType: fileType })
      if ("error" in result) { onUploadError(result.error); return }
      onUploadComplete(result.passage)
    } catch (err) {
      onUploadError(err instanceof Error ? err.message : t("uploadFailed"))
    }
  }

  const handleTextSubmit = async () => {
    if (!pastedText.trim()) return
    onUploadStart(t("pastedTextTitle"))
    onClose()
    setError(null)
    try {
      const result = await studyUploadAction({ text: pastedText, title: t("pastedTextTitle") })
      if ("error" in result) { onUploadError(result.error); return }
      onUploadComplete(result.passage)
    } catch (err) {
      onUploadError(err instanceof Error ? err.message : t("uploadFailed"))
    }
  }

  const handleDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null)
      if (rejectedFiles.length > 0) {
        const code = rejectedFiles[0].errors[0]?.code
        if (code === "file-too-large") setError(t("fileTooLarge"))
        else if (code === "file-invalid-type") setError(t("unsupportedFileType"))
        else setError(t("invalidFileTryAgain"))
        return
      }
      if (acceptedFiles.length > 0) {
        const validation = validateFile(acceptedFiles[0])
        if (!validation.valid) { setError(validation.error ?? t("invalidFile")); return }
        handleFileUpload(acceptedFiles[0])
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: { "text/plain": [".txt"], "application/pdf": [".pdf"] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  })

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-5 pb-4">
          <DialogTitle>{t("addSourceTitle")}</DialogTitle>
          <DialogDescription className="sr-only">{t("uploadOrPasteContent")}</DialogDescription>
        </DialogHeader>

        <div className="px-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t("searchSourcesWeb")} className="pl-10 bg-accent" />
          </div>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {activeMode === null && (
            <>
              <div
                {...getRootProps()}
                className={cn(
                  "flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all min-h-40",
                  isDragActive ? "border-primary bg-accent" : "border-border",
                )}
              >
                <input {...getInputProps()} />
                <Upload className="w-7 h-7 mb-3 text-primary" />
                <p className="text-sm font-medium text-primary">
                  {isDragActive ? t("dropFileHere") : t("dropFilesHere")}
                </p>
                <p className="text-xs mt-1 text-muted-foreground">
                  {t("supportedFileTypes", { size: formatFileSize(10 * 1024 * 1024) })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <SourceButton icon={Upload} label={t("uploadFile")} desc={t("browseFromDevice")} onClick={() => setActiveMode("file")} />
                <SourceButton icon={Globe} label={t("website")} desc={t("comingSoon")} disabled />
                <SourceButton icon={FileText} label={t("googleDrive")} desc={t("comingSoon")} disabled />
                <SourceButton icon={Type} label={t("pasteText")} desc={t("copiedText")} onClick={() => setActiveMode("text")} />
              </div>
            </>
          )}

          {activeMode === "file" && (
            <div>
              <Button variant="ghost" size="sm" onClick={() => setActiveMode(null)} className="text-primary mb-3 -ml-2">
                &larr; {t("backToSources")}
              </Button>
              <div
                {...getRootProps()}
                className={cn(
                  "flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all min-h-55",
                  isDragActive ? "border-primary bg-accent" : "border-border",
                )}
              >
                <input {...getInputProps()} />
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-accent border border-border">
                  <Upload className="w-7 h-7 text-primary" />
                </div>
                <p className="text-base font-semibold mb-1 text-foreground">
                  {isDragActive ? t("dropFileHere") : t("uploadAFile")}
                </p>
                <p className="text-sm text-muted-foreground">{t("dragDropOrBrowse")}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span>.txt, .pdf</span>
                  <span className="text-border">|</span>
                  <span>{t("maxFileSize", { size: formatFileSize(10 * 1024 * 1024) })}</span>
                </div>
              </div>
            </div>
          )}

          {activeMode === "text" && (
            <div>
              <Button variant="ghost" size="sm" onClick={() => setActiveMode(null)} className="text-primary mb-3 -ml-2">
                &larr; {t("backToSources")}
              </Button>
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-accent">
                  <Type className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-primary">{t("pasteYourText")}</h3>
                </div>
                <Textarea
                  value={pastedText}
                  onChange={(e) => { setPastedText(e.target.value); setError(null); }}
                  placeholder={t("pasteEnglishText")}
                  className="w-full p-5 min-h-45 resize-none border-0 focus-visible:ring-0 text-base leading-relaxed bg-surface"
                />
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-accent">
                  <span className="text-xs text-muted-foreground">
                    {t("wordCount", { count: pastedText.trim().split(/\s+/).filter(Boolean).length })}
                  </span>
                  <Button onClick={handleTextSubmit} disabled={pastedText.trim().length === 0} size="sm">
                    {t("continue")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-danger-soft border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end">
          <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
