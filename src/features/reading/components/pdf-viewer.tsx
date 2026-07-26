'use client';

import { useState } from 'react';
import { useSession } from '@/lib/auth/auth-client';
import { pdfjs, Document, Page } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface PdfViewerProps {
  blobPathname: string;
  fileName: string;
}

export function PdfViewer({ blobPathname, fileName }: PdfViewerProps) {
  const { data: session } = useSession();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  if (!session) {
    return <p>Please log in</p>;
  }

  const pdfUrl = `/api/blob?pathname=${encodeURIComponent(blobPathname)}`;

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
      >
        <Page pageNumber={pageNumber} width={600} />
      </Document>

      {numPages && (
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
          >
            Previous
          </button>

          <span>
            Page {pageNumber} of {numPages}
          </span>

          <button
            onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
            disabled={pageNumber >= numPages}
          >
            Next
          </button>

          <a
            href={`${pdfUrl}&download=1`}
            download={fileName}
          >
            Download
          </a>
        </div>
      )}
    </div>
  );
}
