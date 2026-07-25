/**
 * Authenticated blob source route.
 * Streams a private Vercel Blob file to the owning user.
 *
 * Storage adapters return URLs of the form `/api/storage/source?pathname=<encoded>`
 * from `getViewableUrl(name)`. This route validates the session, confirms the
 * requesting user owns the passage that references the blob, then streams the
 * bytes via `downloadFile`.
 */

import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { downloadFile } from "@/infrastructure/storage";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const pathname = request.nextUrl.searchParams.get("pathname");
  if (!pathname) {
    return Response.json({ error: "Missing pathname" }, { status: 400 });
  }

  const passage = await prisma.passage.findUnique({
    where: { filePath: pathname },
    select: { userId: true },
  });

  if (!passage) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (passage.userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const buffer = await downloadFile(pathname);
  if (!buffer) {
    return Response.json({ error: "Blob unavailable" }, { status: 502 });
  }

  const ext = pathname.toLowerCase().split(".").pop() ?? "";
  const contentType =
    {
      pdf: "application/pdf",
      txt: "text/plain; charset=utf-8",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    }[ext] ?? "application/octet-stream";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=300",
    },
  });
}
