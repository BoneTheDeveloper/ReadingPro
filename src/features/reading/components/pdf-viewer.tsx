"use client";

interface PdfViewerProps {
  url: string;
  className?: string;
  showControls?: boolean;
  onClose?: () => void;
}

/**
 * Basic PDF viewer using native browser iframe embed.
 * Zero configuration, no worker setup, uses browser's native PDF controls.
 */
export function PdfViewer({ url, className }: PdfViewerProps) {
  return (
    <iframe
      src={`${url}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
      }}
      title="PDF Viewer"
    />
  );
}
