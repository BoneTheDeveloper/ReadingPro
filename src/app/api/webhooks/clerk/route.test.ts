import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const webhookMocks = vi.hoisted(() => ({
  verifyWebhook: vi.fn(),
}));

vi.mock("@clerk/nextjs/webhooks", () => ({
  verifyWebhook: webhookMocks.verifyWebhook,
}));

const syncMocks = vi.hoisted(() => ({
  syncUser: vi.fn(),
  deleteUserProfile: vi.fn(),
  ensureUserProfile: vi.fn(),
}));

vi.mock("@/server/auth/sync-user", () => ({
  syncUser: syncMocks.syncUser,
  deleteUserProfile: syncMocks.deleteUserProfile,
  ensureUserProfile: syncMocks.ensureUserProfile,
}));

import { POST } from "./route";

// Minimal NextRequest factory — verifyWebhook is mocked so body doesn't matter.
function makeRequest() {
  return new NextRequest("https://app.test/api/webhooks/clerk", { method: "POST" });
}

const USER_ID = "user_test123";

const userPayload = {
  id: USER_ID,
  first_name: "Test",
  last_name: "Reader",
  image_url: "https://img.example.test/avatar.png",
  primary_email_address_id: "email_1",
  email_addresses: [{ id: "email_1", email_address: "test@example.test" }],
};

describe("POST /api/webhooks/clerk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when signature verification fails", async () => {
    webhookMocks.verifyWebhook.mockRejectedValue(new Error("bad signature"));

    const res = await POST(makeRequest());

    expect(res.status).toBe(400);
    expect(syncMocks.syncUser).not.toHaveBeenCalled();
    expect(syncMocks.deleteUserProfile).not.toHaveBeenCalled();
  });

  it("user.created: calls syncUser with snake_case fields mapped correctly", async () => {
    webhookMocks.verifyWebhook.mockResolvedValue({
      type: "user.created",
      data: userPayload,
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(syncMocks.syncUser).toHaveBeenCalledOnce();
    expect(syncMocks.syncUser).toHaveBeenCalledWith(
      USER_ID,
      "test@example.test",
      "Test Reader",
      "https://img.example.test/avatar.png",
    );
  });

  it("user.updated: calls syncUser with updated fields", async () => {
    const updatedPayload = {
      ...userPayload,
      first_name: "Updated",
      last_name: "Name",
      image_url: "https://img.example.test/new-avatar.png",
      email_addresses: [{ id: "email_1", email_address: "updated@example.test" }],
    };
    webhookMocks.verifyWebhook.mockResolvedValue({
      type: "user.updated",
      data: updatedPayload,
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(syncMocks.syncUser).toHaveBeenCalledOnce();
    expect(syncMocks.syncUser).toHaveBeenCalledWith(
      USER_ID,
      "updated@example.test",
      "Updated Name",
      "https://img.example.test/new-avatar.png",
    );
  });

  it("user.created: falls back to first email when primary_email_address_id has no match", async () => {
    webhookMocks.verifyWebhook.mockResolvedValue({
      type: "user.created",
      data: {
        ...userPayload,
        primary_email_address_id: "email_missing",
        email_addresses: [{ id: "email_1", email_address: "fallback@example.test" }],
      },
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(syncMocks.syncUser).toHaveBeenCalledWith(
      USER_ID,
      "fallback@example.test",
      "Test Reader",
      "https://img.example.test/avatar.png",
    );
  });

  it("user.created: handles null first_name / last_name (passes undefined name)", async () => {
    webhookMocks.verifyWebhook.mockResolvedValue({
      type: "user.created",
      data: { ...userPayload, first_name: null, last_name: null },
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(syncMocks.syncUser).toHaveBeenCalledWith(
      USER_ID,
      "test@example.test",
      undefined,
      "https://img.example.test/avatar.png",
    );
  });

  it("user.deleted: calls deleteUserProfile with the user id", async () => {
    webhookMocks.verifyWebhook.mockResolvedValue({
      type: "user.deleted",
      data: { id: USER_ID, deleted: true },
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(syncMocks.deleteUserProfile).toHaveBeenCalledOnce();
    expect(syncMocks.deleteUserProfile).toHaveBeenCalledWith(USER_ID);
    expect(syncMocks.syncUser).not.toHaveBeenCalled();
  });

  it("user.deleted: skips deleteUserProfile when id is absent", async () => {
    webhookMocks.verifyWebhook.mockResolvedValue({
      type: "user.deleted",
      data: { deleted: true },
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(syncMocks.deleteUserProfile).not.toHaveBeenCalled();
  });

  it("unknown event type: acknowledges with 200 without calling any handler", async () => {
    webhookMocks.verifyWebhook.mockResolvedValue({
      type: "session.created",
      data: { id: "sess_abc" },
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(syncMocks.syncUser).not.toHaveBeenCalled();
    expect(syncMocks.deleteUserProfile).not.toHaveBeenCalled();
  });
});
