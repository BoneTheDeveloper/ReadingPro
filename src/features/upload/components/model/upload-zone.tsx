"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react";
import {
  validateFile,
} from "@/features/upload/lib/upload-validation";
import { UPLOAD_CONFIG } from "@/features/upload/lib/upload-config";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing?: boolean;
  disabled?: boolean;
  variant?: "default" | "compact" | "expanded";
  isDragActiveExternal?: boolean;
}

export function UploadZone({
  onFileSelect,
  isProcessing,
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
        const validation = validateFile(acceptedFiles[0]);
        if (!validation.valid) {
          setError(validation.error);
          return;
        }
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
    },
    maxSize: UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES,
    multiple: false,
    disabled: disabled || isProcessing,
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
          "transition-all duration-200 cursor-pointer",
          variantStyles[variant],
          isDragActive && "border-primary bg-accent scale-[1.02]",
          !isDragActive &&
            "border-border hover:border-primary/40 hover:bg-muted",
          (disabled || isProcessing) && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-5">
          <div
            className={cn(
              "rounded-xl flex items-center justify-center transition-transform bg-indigo-soft",
              variant === "compact" ? "w-7 h-7" : "w-14 h-14",
              variant === "expanded" && "mb-4",
              isDragActive && "scale-110"
            )}
          >
            {isProcessing ? (
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            ) : (
              <Upload className="w-7 h-7 text-primary" />
            )}
          </div>

          <div>
            <h3
              className={cn(
                "font-semibold text-foreground mb-2",
                variant === "compact"
                  ? "text-sm"
                  : variant === "expanded"
                    ? "text-base"
                    : "text-lg"
              )}
            >
              {isDragActive
                ? "Drop your file here"
                : isProcessing
                  ? "Processing..."
                  : "Upload your content"}
            </h3>
            <p
              className={cn(
                "text-muted-foreground",
                variant === "compact" ? "text-xs" : "text-sm"
              )}
            >
              {isProcessing
                ? "Please wait while we process your file"
                : "Drag and drop, or click to browse"}
            </p>
          </div>

          {!isProcessing && (
            <div
              className={cn(
                "flex items-center gap-4 text-muted-foreground",
                variant === "compact" ? "text-xs" : "text-sm"
              )}
            >
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                {UPLOAD_CONFIG.ALLOWED_EXTENSIONS.join(", ")}
              </span>
              <span className="text-border">|</span>
              <span>
                Max {UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB
              </span>
            </div>
          )}
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
