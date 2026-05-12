"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadZone } from "@/components/upload-zone";
import { TextInputArea } from "@/components/text-input-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared/utils";

export default function UploadPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<"file" | "text">("file");

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      const result = await response.json();
      if (result.data?.passageId) router.push(`/reading/${result.data.passageId}`);
      else router.push(`/processing?filename=${result.data.filename}`);
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async (text: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/upload/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, isText: true }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Processing failed");
      }
      const result = await response.json();
      if (result.data?.passageId) router.push(`/reading/${result.data.passageId}`);
      else router.push("/upload");
    } catch (error) {
      console.error("Text processing error:", error);
      alert(error instanceof Error ? error.message : "Processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">Upload Content</h1>
          <p className="text-muted-foreground">Add reading material for AI-powered analysis</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex gap-4 mb-8">
          <Button
            onClick={() => setUploadMethod("file")}
            variant={uploadMethod === "file" ? "default" : "outline"}
            className={cn(uploadMethod === "file" ? "" : "bg-background text-foreground")}
          >
            Upload File
          </Button>
          <Button
            onClick={() => setUploadMethod("text")}
            variant={uploadMethod === "text" ? "default" : "outline"}
            className={cn(uploadMethod === "text" ? "" : "bg-background text-foreground")}
          >
            Paste Text
          </Button>
        </div>

        {uploadMethod === "file" ? (
          <UploadZone onFileSelect={handleFileUpload} isProcessing={isProcessing} disabled={isProcessing} />
        ) : (
          <TextInputArea onSubmit={handleTextSubmit} isProcessing={isProcessing} disabled={isProcessing} />
        )}
      </main>
    </div>
  );
}
