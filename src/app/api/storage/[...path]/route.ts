/**
 * Local Storage API Route
 * Serves files from tmp/uploads/ directory.
 * Only active when STORAGE_PROVIDER=local
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const LOCAL_STORAGE_DIR = path.join(process.cwd(), "tmp");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Only allow in local development
  if (process.env.STORAGE_PROVIDER !== "local") {
    return NextResponse.json(
      { error: "Local storage not enabled" },
      { status: 404 }
    );
  }

  const { path: pathSegments } = await params;
  const pathname = pathSegments.join("/");

  try {
    const filePath = path.join(LOCAL_STORAGE_DIR, pathname);

    // Security: prevent directory traversal
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(LOCAL_STORAGE_DIR)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const file = await fs.readFile(resolvedPath);

    // Determine content type from extension
    const ext = path.extname(pathname).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".txt": "text/plain",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
