/**
 * Vercel Blob Storage Adapter - Production
 * Wraps Vercel Blob SDK with the same interface as local adapter.
 */

import "server-only";
import { put, del, head, get } from "@vercel/blob";
import { moduleLog } from "@/lib/logger";

const log = moduleLog("storage:blob");

export interface StorageResult {
  url: string;
  pathname: string;
}

/**
 * Upload a file to Vercel Blob storage.
 */
export async function uploadFile(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<StorageResult | null> {
  try {
    const blob = await put(filename, buffer, {
      contentType,
      access: "private",
      addRandomSuffix: false,
    });
    log.info({ pathname: filename, url: blob.url }, "Uploaded to Vercel Blob");
    return { url: blob.url, pathname: blob.pathname };
  } catch (err) {
    log.error({ err, pathname: filename }, "Upload failed");
    return null;
  }
}

/**
 * Delete a file from Vercel Blob storage.
 */
export async function deleteFile(pathname: string): Promise<boolean> {
  try {
    const blobInfo = await head(pathname);
    if (blobInfo) {
      await del(blobInfo.downloadUrl);
    }
    log.info({ pathname }, "Deleted file");
    return true;
  } catch (err) {
    log.error({ err, pathname }, "Delete failed");
    return false;
  }
}

/**
 * Get a URL for viewing a file.
 */
export async function getViewableUrl(pathname: string): Promise<string | null> {
  try {
    const blobInfo = await head(pathname);
    return blobInfo?.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Get a URL for downloading a file.
 */
export async function getDownloadUrl(pathname: string): Promise<string | null> {
  try {
    const blobInfo = await head(pathname);
    return blobInfo?.downloadUrl ?? null;
  } catch {
    return null;
  }
}

/**
 * Alias for getViewableUrl.
 */
export const getSignedUrl = getViewableUrl;

/**
 * Download a stored file's raw bytes for processing.
 */
export async function downloadFile(pathname: string): Promise<Buffer | null> {
  try {
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    const arrayBuffer = await new Response(result.stream).arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    log.error({ err, pathname }, "Download failed");
    return null;
  }
}
