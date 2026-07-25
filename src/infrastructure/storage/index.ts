/**
 * Storage Adapter - Vercel Blob only
 * Remote-only storage. All uploads, downloads, and URL resolution go through
 * Vercel Blob, including local development. A valid BLOB_READ_WRITE_TOKEN is
 * required in every environment.
 */

import "server-only";

export {
  uploadFile,
  deleteFile,
  downloadFile,
  getViewableUrl,
  type StorageResult,
} from "./blob-adapter";
