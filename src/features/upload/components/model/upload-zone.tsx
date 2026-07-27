"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { validateFile } from "@/features/upload/utils/upload-validation";
import { UPLOAD_CONFIG } from "@/features/upload/utils/upload-config";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onTxtSelect: (file: File) => void;
  onPdfSelect: (file: File) => void;
  disabled?: boolean;
  variant?: "default" | "compact" | "expanded";
}

export function UploadZone({
  onTxtSelect,
  onPdfSelect,
  disabled,
  variant = "default",
}: UploadZoneProps) {
  const [error, setError] = useState<string>();

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(undefined);

      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          setError(UPLOAD_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE);
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          setError(UPLOAD_CONFIG.ERROR_MESSAGES.INVALID_TYPE);
        } else {
          setError("Invalid file. Please try again.");
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const validation = validateFile(file);
        if (!validation.valid) {
          setError(validation.error);
          return;
        }
        // Route by extension/MIME — TXT goes to the text path,
        // PDF goes to the blob path. They never share a callback.
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          onPdfSelect(file);
        } else {
          onTxtSelect(file);
        }
      }
    },
    [onTxtSelect, onPdfSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
    },
    maxSize: UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES,
    multiple: false,
    disabled: disabled,
  });

  const variantStyles = {
    default: "min-h-[300px] p-12",
    compact: "min-h-40 p-8",
    expanded: "min-h-55 p-10",
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center",
          "border-2 border-dashed rounded-xl text-center",
          "transition-colors duration-200 cursor-pointer",
          variantStyles[variant],
          isDragActive ? "border-primary bg-accent/50" : "border-border hover:bg-muted",
          disabled && "opacity-60 cursor-not-allowed pointer-events-none"
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-5">
          <div
            className={cn(
              "rounded-xl flex items-center justify-center bg-indigo-soft",
              variant === "compact" ? "w-7 h-7" : "w-14 h-14"
            )}
          >
            <Upload className="w-7 h-7 text-primary" />
          </div>

          <div>
            <h3
              className={cn(
                "font-semibold text-foreground mb-1",
                variant === "compact" ? "text-sm" : "text-lg"
              )}
            >
              Tải file của bạn lên
            </h3>
            <p
              className={cn(
                "text-muted-foreground",
                variant === "compact" ? "text-xs" : "text-sm"
              )}
            >
              Ấn để bật hoặc kéo file vào đây
            </p>
          </div>

          <div
            className={cn(
              "flex items-center gap-4 text-muted-foreground mt-1",
              variant === "compact" ? "text-xs" : "text-sm"
            )}
          >
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> .txt, .pdf
            </span>
            <span className="text-border">|</span>
            <span>Max {UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-danger-soft border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
