import { NextRequest, NextResponse } from "next/server";
import { readFileBuffer } from "@/services/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pathname: string }> },
) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const { pathname } = await params;
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return NextResponse.json({ error: "Invalid pathname encoding" }, { status: 400 });
  }
  const buffer = await readFileBuffer(decoded);

  if (!buffer) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `inline; filename="${decoded.split("/").pop()}"`,
    },
  });
}
