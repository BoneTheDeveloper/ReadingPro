"use client";

import { useState } from "react";
import { UploadZone } from "./upload-zone";
import { TextInputArea } from "./text-input-area";
import { Button } from "@/components/primitives/button";
import { cn } from "@/components/utils";
import { useUploadSubmit } from "../hooks/use-upload-submit";

export function UploadPageClient() {
  const [uploadMethod, setUploadMethod] = useState<"file" | "text">("file");
  const { isProcessing, handleFileUpload, handleTextSubmit } =
    useUploadSubmit();

  return (
    <div className="min-h-dvh bg-panel">
      <header className="bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">Upload Content</h1>
          <p className="text-muted-foreground">
            Add reading material for AI-powered analysis
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex gap-4 mb-8">
          <Button
            onClick={() => setUploadMethod("file")}
            variant={uploadMethod === "file" ? "default" : "outline"}
            className={cn(
              uploadMethod === "file" ? "" : "bg-surface text-foreground",
            )}
          >
            Upload File
          </Button>
          <Button
            onClick={() => setUploadMethod("text")}
            variant={uploadMethod === "text" ? "default" : "outline"}
            className={cn(
              uploadMethod === "text" ? "" : "bg-surface text-foreground",
            )}
          >
            Paste Text
          </Button>
        </div>

        {uploadMethod === "file" ? (
          <UploadZone
            onFileSelect={handleFileUpload}
            isProcessing={isProcessing}
            disabled={isProcessing}
          />
        ) : (
          <TextInputArea
            onSubmit={handleTextSubmit}
            isProcessing={isProcessing}
            disabled={isProcessing}
          />
        )}
      </main>
    </div>
  );
}
