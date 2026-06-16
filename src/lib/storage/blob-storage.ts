import 'server-only';
import { put, del, head } from "@vercel/blob";
import { writeFile, mkdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { createModuleLogger } from "@/lib/core/logger";

const log = createModuleLogger("storage:blob");

/**
 * Storage environment:
 *   "local"  — local dev, files saved to .local-blob-storage/
 *   "preview" — Vercel preview deploys, uses preview blob store token
 *   "production" — Vercel production deploys, uses production blob store token
 *
 * Vercel automatically injects the correct BLOB_READ_WRITE_TOKEN per
 * environment when you configure separate tokens in Project Settings > Environment Variables.
 */
type StorageEnv = "local" | "preview" | "production";

const LOCAL_STORAGE_DIR = path.resolve(".local-blob-storage");

function getStorageEnv(): StorageEnv {
  if (process.env.NODE_ENV === "development") return "local";
  if (process.env.VERCEL_ENV === "production") return "production";
  // VERCEL_ENV is "preview" for preview deploys
  return "preview";
}

// ---------- Types ----------

export interface StorageResult {
  url: string;
  pathname: string;
}

export interface StorageAdapter {
  upload: (
    pathname: string,
    body: Buffer,
    contentType: string,
  ) => Promise<StorageResult | null>;
  delete: (pathname: string) => Promise<boolean>;
  getSignedUrl: (pathname: string) => Promise<string | null>;
}

// ---------- Vercel Blob (preview + production) ----------
// The correct store is selected automatically based on BLOB_READ_WRITE_TOKEN,
// which you configure per-environment in the Vercel dashboard.

const vercelBlobAdapter: StorageAdapter = {
  async upload(pathname, body, contentType) {
    try {
      const env = getStorageEnv();
      const blob = await put(pathname, body, {
        contentType,
        access: "private",
        addRandomSuffix: false,
      });
      log.info({ pathname, url: blob.url, env }, "Uploaded to Vercel Blob");
      return { url: blob.url, pathname: blob.pathname };
    } catch (err) {
      log.error({ err, pathname }, "Vercel Blob upload failed");
      return null;
    }
  },

  async delete(pathname) {
    try {
      const blobInfo = await head(pathname);
      if (!blobInfo) return true;
      await del(blobInfo.url);
      log.info({ pathname }, "Deleted from Vercel Blob");
      return true;
    } catch (err) {
      log.error({ err, pathname }, "Vercel Blob delete failed");
      return false;
    }
  },

  async getSignedUrl(pathname) {
    try {
      const blobInfo = await head(pathname);
      return blobInfo?.url ?? null;
    } catch {
      return null;
    }
  },
};

// ---------- Local filesystem (development only) ----------

async function ensureDir() {
  await mkdir(LOCAL_STORAGE_DIR, { recursive: true });
}

function localPath(pathname: string) {
  const normalized = path.posix.normalize(`/${pathname}`).slice(1);
  const fullPath = path.resolve(LOCAL_STORAGE_DIR, normalized);
  if (!fullPath.startsWith(`${LOCAL_STORAGE_DIR}${path.sep}`) && fullPath !== LOCAL_STORAGE_DIR) {
    throw new Error("Invalid storage pathname");
  }
  return fullPath;
}

const localAdapter: StorageAdapter = {
  async upload(pathname, body) {
    try {
      const full = localPath(pathname);
      await ensureDir();
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, body);
      const url = `/api/local-blob/${encodeURIComponent(pathname)}`;
      log.info({ pathname, full }, "Uploaded to local storage");
      return { url, pathname };
    } catch (err) {
      log.error({ err, pathname }, "Local storage upload failed");
      return null;
    }
  },

  async delete(pathname) {
    try {
      const full = localPath(pathname);
      await unlink(full);
      log.info({ pathname }, "Deleted from local storage");
      return true;
    } catch (err) {
      log.error({ err, pathname }, "Local storage delete failed");
      return false;
    }
  },

  async getSignedUrl(pathname) {
    return `/api/local-blob/${encodeURIComponent(pathname)}`;
  },
};

// ---------- Exported API ----------

const adapterMap: Record<StorageEnv, StorageAdapter> = {
  local: localAdapter,
  preview: vercelBlobAdapter,
  production: vercelBlobAdapter,
};

function getAdapter(): StorageAdapter {
  return adapterMap[getStorageEnv()];
}

export async function uploadFile(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<StorageResult | null> {
  return getAdapter().upload(filename, buffer, contentType);
}

export async function deleteFile(pathname: string): Promise<boolean> {
  return getAdapter().delete(pathname);
}

export async function getSignedUrl(pathname: string): Promise<string | null> {
  return getAdapter().getSignedUrl(pathname);
}

export async function readFileBuffer(pathname: string): Promise<Buffer | null> {
  if (getStorageEnv() !== "local") return null;
  try {
    return await readFile(localPath(pathname));
  } catch {
    return null;
  }
}
