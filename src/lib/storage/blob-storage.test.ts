import { afterEach, describe, expect, it, vi } from "vitest";

const blobMocks = vi.hoisted(() => ({
  put: vi.fn(),
  del: vi.fn(),
  head: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  put: blobMocks.put,
  del: blobMocks.del,
  head: blobMocks.head,
}));

import { uploadFile } from "./blob-storage";

describe("blob storage adapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("uploads Vercel Blob files with private access", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    blobMocks.put.mockResolvedValue({
      url: "https://blob.example.test/uploads/file.txt",
      pathname: "uploads/file.txt",
    });

    await expect(uploadFile("uploads/file.txt", Buffer.from("hello"), "text/plain")).resolves.toEqual({
      url: "https://blob.example.test/uploads/file.txt",
      pathname: "uploads/file.txt",
    });

    expect(blobMocks.put).toHaveBeenCalledWith(
      "uploads/file.txt",
      Buffer.from("hello"),
      {
        contentType: "text/plain",
        access: "private",
        addRandomSuffix: false,
      },
    );
  });
});
