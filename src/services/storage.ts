import "server-only";
import { put, del, head, get } from "@vercel/blob";
import { writeFile, mkdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("storage:blob");

const LOCAL_STORAGE_DIR = path.resolve(".local-blob-storage");

/** Use local filesystem in dev or when no Blob token is configured. */
function isLocalStorage(): boolean {
  return (
    process.env.NODE_ENV === "development" || !process.env.BLOB_READ_WRITE_TOKEN
  );
}

// ---------- Types ----------

export interface StorageResult {
  url: string;
  pathname: string;
}

// ---------- Helpers ----------

function localPath(pathname: string): string {
  const normalized = path.posix.normalize(`/${pathname}`).slice(1);
  const fullPath = path.resolve(LOCAL_STORAGE_DIR, normalized);
  if (
    !fullPath.startsWith(`${LOCAL_STORAGE_DIR}${path.sep}`) &&
    fullPath !== LOCAL_STORAGE_DIR
  ) {
    throw new Error("Invalid storage pathname");
  }
  return fullPath;
}

function localUrl(pathname: string): string {
  return `/api/local-blob/${encodeURIComponent(pathname)}`;
}

// ---------- Exported API ----------

export async function uploadFile(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<StorageResult | null> {
  try {
    if (isLocalStorage()) {
      const full = localPath(filename);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, buffer);
      log.info({ pathname: filename }, "Uploaded to local storage");
      return { url: localUrl(filename), pathname: filename };
    }

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

export async function deleteFile(pathname: string): Promise<boolean> {
  try {
    if (isLocalStorage()) {
      await unlink(localPath(pathname));
    } else {
      const blobInfo = await head(pathname);
      if (blobInfo) await del(blobInfo.url);
    }
    log.info({ pathname }, "Deleted file");
    return true;
  } catch (err) {
    log.error({ err, pathname }, "Delete failed");
    return false;
  }
}

export async function getSignedUrl(pathname: string): Promise<string | null> {
  if (isLocalStorage()) return localUrl(pathname);
  try {
    const blobInfo = await head(pathname);
    return blobInfo?.url ?? null;
  } catch {
    return null;
  }
}

export async function readFileBuffer(pathname: string): Promise<Buffer | null> {
  if (!isLocalStorage()) return null;
  try {
    return await readFile(localPath(pathname));
  } catch {
    return null;
  }
}

/**
 * Download a stored file's raw bytes. Works in both storage modes so the
 * background worker can read a file the upload action persisted:
 *   - local dev  → read from the on-disk fallback store
 *   - production → stream the private blob via the Blob read/write token
 */
export async function downloadFile(pathname: string): Promise<Buffer | null> {
  try {
    if (isLocalStorage()) {
      return await readFileBuffer(pathname);
    }
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    const arrayBuffer = await new Response(result.stream).arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    log.error({ err, pathname }, "Download failed");
    return null;
  }
}
