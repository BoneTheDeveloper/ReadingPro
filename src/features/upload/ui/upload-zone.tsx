"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react";
import {
  validateFile,
  formatFileSize,
} from "@/contracts/upload/upload-validation";
import { cn } from "@/components/utils";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing?: boolean;
  disabled?: boolean;
}

export function UploadZone({
  onFileSelect,
  isProcessing,
  disabled,
}: UploadZoneProps) {
  const [error, setError] = useState<string>();

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(undefined);

      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          setError("File size exceeds 10MB limit");
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          setError("Only .txt and .pdf files are supported");
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
    [onFileSelect],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled: disabled || isProcessing,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center",
          "border-2 border-dashed rounded-[14px] p-12 text-center",
          "transition-all duration-200 cursor-pointer",
          "min-h-[300px]",
          isDragActive && "border-primary bg-accent scale-[1.02]",
          !isDragActive &&
            "border-border hover:border-primary/40 hover:bg-muted",
          (disabled || isProcessing) && "opacity-50 cursor-not-allowed",
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-5">
          <div
            className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center transition-transform",
              isDragActive ? "bg-indigo-soft scale-110" : "bg-indigo-soft",
            )}
          >
            {isProcessing ? (
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            ) : (
              <Upload className="w-7 h-7 text-primary" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {isDragActive
                ? "Drop your file here"
                : isProcessing
                  ? "Processing..."
                  : "Upload your content"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {isProcessing
                ? "Please wait while we process your file"
                : "Drag and drop, or click to browse"}
            </p>
          </div>

          {!isProcessing && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                .txt, .pdf
              </span>
              <span className="text-border">|</span>
              <span>Max {formatFileSize(10 * 1024 * 1024)}</span>
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
