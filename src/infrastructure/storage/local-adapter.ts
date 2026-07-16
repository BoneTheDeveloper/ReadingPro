/**
 * Local Storage Adapter - Development Only
 * Stores files in the local filesystem instead of Vercel Blob.
 * Use STORAGE_PROVIDER=local in .env.local for development.
 */

import "server-only";
import fs from "fs/promises";
import path from "path";
import { moduleLog } from "@/lib/logger";

const log = moduleLog("storage:local");

// Local storage directory - relative to project root
// Filename already includes path structure (e.g., "uploads/userId/file.pdf")
const LOCAL_STORAGE_DIR = path.join(process.cwd(), "tmp");

export interface StorageResult {
  url: string;
  pathname: string;
}

/**
 * Ensure the local storage directory exists.
 */
async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true });
  } catch (err) {
    log.error({ err }, "Failed to create storage directory");
    throw err;
  }
}

/**
 * Upload a file to local filesystem.
 * Returns a URL like: /api/storage/local/path/to/file.pdf
 */
export async function uploadFile(
  filename: string,
  buffer: Buffer,
  _contentType: string,
): Promise<StorageResult | null> {
  try {
    await ensureStorageDir();

    // Create user subdirectory if filename includes path
    const fullPath = path.join(LOCAL_STORAGE_DIR, filename);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, buffer);

    // URL points to our API route for local dev
    const url = `/api/storage/${filename}`;
    log.info({ pathname: filename, url }, "Uploaded to local storage");
    return { url, pathname: filename };
  } catch (err) {
    log.error({ err, filename }, "Local upload failed");
    return null;
  }
}

/**
 * Delete a file from local filesystem.
 */
export async function deleteFile(pathname: string): Promise<boolean> {
  try {
    const fullPath = path.join(LOCAL_STORAGE_DIR, pathname);
    await fs.unlink(fullPath);
    log.info({ pathname }, "Deleted from local storage");
    return true;
  } catch (err) {
    log.error({ err, pathname }, "Delete failed");
    return false;
  }
}

/**
 * Get the URL for viewing a file.
 */
export async function getViewableUrl(pathname: string): Promise<string | null> {
  // Return the API route path - local storage serves files via /api/storage/
  return `/api/storage/${pathname}`;
}


/**
 * Get download URL (same as viewable for local).
 */
export async function getDownloadUrl(pathname: string): Promise<string | null> {
  return `/api/storage/${pathname}`;
}

/**
 * Download a file's content as Buffer.
 */
export async function downloadFile(pathname: string): Promise<Buffer | null> {
  try {
    const fullPath = path.join(LOCAL_STORAGE_DIR, pathname);
    const buffer = await fs.readFile(fullPath);
    return buffer;
  } catch (err) {
    log.error({ err, pathname }, "Download failed");
    return null;
  }
}

/**
 * Check if local storage is configured.
 */
export function isLocalStorageAvailable(): boolean {
  return process.env.STORAGE_PROVIDER === "local";
}
