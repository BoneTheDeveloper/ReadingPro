/**
 * Storage Adapter - Hybrid (Local + Vercel Blob)
 * Routes to local filesystem for development, Vercel Blob for production.
 */

import "server-only";

// ---------- Types ----------

export interface StorageResult {
  url: string;
  pathname: string;
}

// ---------- Adapter Selection ----------

// Lazy-loaded adapters (loaded on first use)
let localAdapter: typeof import("./local-adapter") | null = null;
let blobAdapter: typeof import("./blob-adapter") | null = null;

async function getAdapter() {
  const provider = process.env.STORAGE_PROVIDER;

  if (provider === "local") {
    if (!localAdapter) {
      localAdapter = await import("./local-adapter");
    }
    return localAdapter;
  }

  if (!blobAdapter) {
    blobAdapter = await import("./blob-adapter");
  }
  return blobAdapter;
}

// ---------- Exported API ----------

/**
 * Upload a file to storage.
 * - Local dev: STORAGE_PROVIDER=local
 * - Production: uses Vercel Blob (default)
 */
export async function uploadFile(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<StorageResult | null> {
  const adapter = await getAdapter();
  return adapter.uploadFile(filename, buffer, contentType);
}

/**
 * Delete a file from storage.
 */

/**
 * Get a URL for viewing a file (inline).
 */
export async function getViewableUrl(pathname: string): Promise<string | null> {
  const adapter = await getAdapter();
  return adapter.getViewableUrl(pathname);
}

/**
 * Get a URL for downloading a file.
 */

/**
 * Download a stored file's raw bytes for processing.
 */
export async function downloadFile(pathname: string): Promise<Buffer | null> {
  const adapter = await getAdapter();
  return adapter.downloadFile(pathname);
}

/**
 * Check which storage provider is active.
 */
