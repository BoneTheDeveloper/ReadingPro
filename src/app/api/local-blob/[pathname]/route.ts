import { NextRequest, NextResponse } from "next/server";
import { readFileBuffer } from "@/services/storage";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";

const MODULE = "api:local-blob";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pathname: string }> },
) {
  const requestLog = createRequestLogger(
    MODULE,
    createRequestLogContext(request, "GET", "/api/local-blob"),
  );

  if (process.env.NODE_ENV !== "development") {
    requestLog.warn("blocked non-development access");
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const { pathname } = await params;
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    requestLog.warn({ context: { pathname } }, "invalid pathname encoding");
    return NextResponse.json({ error: "Invalid pathname encoding" }, { status: 400 });
  }

  requestLog.debug({ context: { pathname: decoded } }, "reading file");
  const buffer = await readFileBuffer(decoded);

  if (!buffer) {
    requestLog.warn({ context: { pathname: decoded } }, "file not found");
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `inline; filename="${decoded.split("/").pop()}"`,
    },
  });
}
