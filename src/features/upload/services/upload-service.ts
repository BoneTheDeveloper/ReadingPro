"use client";

import * as Sentry from "@sentry/nextjs";
import { uploadFileAction, uploadTextAction } from "../actions";

/**
 * Upload a file to be processed.
 */
export async function uploadFile(file: File) {
  try {
    const result = await uploadFileAction(file);

    if (!result.success) {
      throw new Error("Upload failed");
    }

    return result.data;
  } catch (error) {
    Sentry.addBreadcrumb({
      category: "upload",
      level: "error",
      message: "upload-file-error",
    });
    throw error;
  }
}

/**
 * Submit raw text to be processed.
 */
export async function uploadText(text: string) {
  try {
    const result = await uploadTextAction({ text });

    if (!result.success) {
      throw new Error("Processing failed");
    }

    return result.data;
  } catch (error) {
    Sentry.addBreadcrumb({
      category: "upload",
      level: "error",
      message: "upload-text-error",
    });
    throw error;
  }
}
