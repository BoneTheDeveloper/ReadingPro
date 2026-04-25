"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { FILE_LIMITS, FILE_ERRORS } from "@/features/passage/util/upload-config";
import { cn } from "@/lib/utils";

const REJECTION_MESSAGE: Record<string, string> = {
  "file-too-large": FILE_ERRORS.FILE_TOO_LARGE,
  "file-invalid-type": FILE_ERRORS.INVALID_TYPE,
  "file-too-small": "File rỗng, vui lòng chọn file khác",
};

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
    (accepted: File[], rejected: FileRejection[]) => {
      const code = rejected[0]?.errors[0]?.code;
      if (code) {
        setError(REJECTION_MESSAGE[code] ?? "File không hợp lệ, vui lòng thử lại");
        return;
      }

      const file = accepted[0];
      if (!file) return;

      setError(undefined);
      if (/\.pdf$/i.test(file.name)) onPdfSelect(file);
      else onTxtSelect(file);
    },
    [onTxtSelect, onPdfSelect],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".txt"], "application/pdf": [".pdf"] },
    maxSize: FILE_LIMITS.MAX_FILE_SIZE_BYTES,
    minSize: FILE_LIMITS.MIN_FILE_SIZE,
    multiple: false,
    disabled,
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
            <span>Max {FILE_LIMITS.MAX_FILE_SIZE_MB}MB</span>
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
