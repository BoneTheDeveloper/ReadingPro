import 'server-only';
import { PDFParse } from 'pdf-parse';

export interface ParsedPDF {
  text: string;
  pages: number;
  metadata?: {
    title?: string;
    author?: string;
    creationDate?: Date;
  };
}

export async function parsePDF(buffer: Buffer): Promise<ParsedPDF> {
  try {
    const pdfParse = new PDFParse(new Uint8Array(buffer));
    const textResult = await pdfParse.getText();
    const infoResult = await pdfParse.getInfo();

    const cleanedText = textResult.text
      .replace(/\f/g, '\n\n')
      .replace(/\s+/g, ' ')
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join('\n');

    return {
      text: cleanedText.trim(),
      pages: textResult.pages.length,
      metadata: {
        title: infoResult.info?.Title,
        author: infoResult.info?.Author,
        creationDate: infoResult.info?.CreationDate,
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function extractTitleFromPDF(pdf: ParsedPDF, filename: string): string {
  if (pdf.metadata?.title) {
    return pdf.metadata.title;
  }

  const firstLine = pdf.text.split('\n')[0];
  if (firstLine && firstLine.length < 100 && firstLine.length > 3) {
    return firstLine;
  }

  return filename.replace('.pdf', '').replace(/[_-]/g, ' ');
}