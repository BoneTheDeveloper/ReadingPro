import "server-only";
import { del, get } from "@vercel/blob";
import { moduleLog } from "@/lib/logger";

const log = moduleLog("storage:blob");

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

/**
 * Delete a file from Vercel Blob storage.
 */
export async function deleteFile(pathname: string): Promise<boolean> {
  try {
    await del(pathname);
    log.info({ pathname }, "Deleted file");
    return true;
  } catch (err) {
    log.error({ err, pathname }, "Delete failed");
    return false;
  }
}
