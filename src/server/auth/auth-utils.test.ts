import { beforeEach, describe, expect, it, vi } from "vitest";
import { userProfileFixture } from "@tests/vitest/fixtures/user";
import { db } from "../db/client";

const clerkMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getUser: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: clerkMocks.auth,
  clerkClient: clerkMocks.clerkClient,
}));

import {
  AuthenticationRequiredError,
  getCurrentUser,
  requireAuth,
} from "./auth-utils";

describe("Clerk auth profile bootstrap", () => {
  beforeEach(() => {
    clerkMocks.auth.mockReset();
    clerkMocks.getUser.mockReset();
    clerkMocks.clerkClient.mockReset();
    clerkMocks.clerkClient.mockResolvedValue({
      users: { getUser: clerkMocks.getUser },
    });
  });

  it("returns null and throws the typed auth error without a Clerk session", async () => {
    clerkMocks.auth.mockResolvedValue({ userId: null });

    await expect(getCurrentUser()).resolves.toBeNull();
    await expect(requireAuth()).rejects.toBeInstanceOf(AuthenticationRequiredError);
    expect(db.userProfile.findUnique).not.toHaveBeenCalled();
  });

  it("refreshes an existing profile from Clerk identity metadata", async () => {
    clerkMocks.auth.mockResolvedValue({ userId: userProfileFixture.id });
    clerkMocks.getUser.mockResolvedValue({
      id: userProfileFixture.id,
      firstName: "Test",
      fullName: "Updated Reader",
      imageUrl: "https://img.example.test/updated-avatar.png",
      primaryEmailAddressId: "email_1",
      emailAddresses: [
        { id: "email_1", emailAddress: "updated-reader@example.test" },
      ],
    });
    vi.mocked(db.userProfile.upsert).mockResolvedValue({
      ...userProfileFixture,
      email: "updated-reader@example.test",
      name: "Updated Reader",
      avatarUrl: "https://img.example.test/updated-avatar.png",
    });

    await expect(getCurrentUser()).resolves.toMatchObject({
      email: "updated-reader@example.test",
      name: "Updated Reader",
      avatarUrl: "https://img.example.test/updated-avatar.png",
    });
    expect(clerkMocks.clerkClient).toHaveBeenCalled();
    expect(db.userProfile.upsert).toHaveBeenCalledWith({
      where: { id: userProfileFixture.id },
      update: {
        email: "updated-reader@example.test",
        name: "Updated Reader",
        avatarUrl: "https://img.example.test/updated-avatar.png",
      },
      create: {
        id: userProfileFixture.id,
        email: "updated-reader@example.test",
        name: "Updated Reader",
        avatarUrl: "https://img.example.test/updated-avatar.png",
      },
    });
  });

  it("upserts a missing profile from Clerk identity metadata", async () => {
    clerkMocks.auth.mockResolvedValue({ userId: userProfileFixture.id });
    vi.mocked(db.userProfile.findUnique).mockResolvedValue(null);
    clerkMocks.getUser.mockResolvedValue({
      id: userProfileFixture.id,
      firstName: "Test",
      fullName: "Test Reader",
      imageUrl: "https://img.example.test/avatar.png",
      primaryEmailAddressId: "email_1",
      emailAddresses: [
        { id: "email_1", emailAddress: userProfileFixture.email },
      ],
    });
    vi.mocked(db.userProfile.upsert).mockResolvedValue(userProfileFixture);

    await expect(getCurrentUser()).resolves.toBe(userProfileFixture);
    expect(db.userProfile.upsert).toHaveBeenCalledWith({
      where: { id: userProfileFixture.id },
      update: {
        email: userProfileFixture.email,
        name: "Test Reader",
        avatarUrl: "https://img.example.test/avatar.png",
      },
      create: {
        id: userProfileFixture.id,
        email: userProfileFixture.email,
        name: "Test Reader",
        avatarUrl: "https://img.example.test/avatar.png",
      },
    });
  });
});
