"use client";

import { extractText } from "unpdf";

const PARSE_TIMEOUT_MS = 15_000;

export async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      extractText(new Uint8Array(buffer), { mergePages: true }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`PDF parse timed out after ${PARSE_TIMEOUT_MS}ms`)),
          PARSE_TIMEOUT_MS,
        );
      }),
    ]);

    const text = Array.isArray(result.text)
      ? result.text.join("\n")
      : result.text;

    return text.trim();
  } finally {
    if (timer) clearTimeout(timer);
  }
}
