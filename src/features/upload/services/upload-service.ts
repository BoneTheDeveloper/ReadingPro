"use client";

import { uploadFileAction, uploadTextAction } from "../actions";

/**
 * Upload a file to be processed.
 */
export async function uploadFile(file: File) {
  const result = await uploadFileAction(file);

  if (!result.success) {
    throw new Error("Upload failed");
  }

  return result.data;
}

/**
 * Submit raw text to be processed.
 */
export async function uploadText(text: string) {
  const result = await uploadTextAction({ text });

  if (!result.success) {
    throw new Error("Processing failed");
  }

  return result.data;
}
