"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker - use CDN with specific version to avoid dynamic import issues
const PDFJS_VERSION = "4.4.168";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  className?: string;
  showControls?: boolean;
  onClose?: () => void;
}

export function PdfViewer({ url, className, showControls = true, onClose }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(err: Error) {
    console.error("PDF load error:", err);
    setError("Failed to load PDF");
    setLoading(false);
  }

  const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className={cn("flex flex-col h-full bg-muted/20", className)}>
      {/* Controls */}
      {showControls && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface">
          <div className="flex items-center gap-2">
            {/* Page navigation */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm min-w-[80px] text-center">
              {pageNumber} / {numPages || "?"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const currentIndex = zoomLevels.indexOf(scale);
                if (currentIndex > 0) setScale(zoomLevels[currentIndex - 1]);
              }}
              disabled={scale <= zoomLevels[0]}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm min-w-[50px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const currentIndex = zoomLevels.indexOf(scale);
                if (currentIndex < zoomLevels.length - 1) {
                  setScale(zoomLevels[currentIndex + 1]);
                }
              }}
              disabled={scale >= zoomLevels[zoomLevels.length - 1]}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* PDF Content */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full text-destructive">
            {error}
          </div>
        )}

        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className="shadow-lg"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            loading={null}
            className="bg-white"
          />
        </Document>
      </div>
    </div>
  );
}
