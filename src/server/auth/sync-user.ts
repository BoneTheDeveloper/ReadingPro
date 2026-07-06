import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/lib/db";
import { createModuleLogger } from "@/server/observability/logger";

const log = createModuleLogger("auth:sync-user");

export async function syncUser(
  authId: string,
  email?: string,
  name?: string,
  avatarUrl?: string,
) {
  return prisma.userProfile.upsert({
    where: { id: authId },
    update: {
      email: email || null,
      name: name || null,
      avatarUrl: avatarUrl || null,
    },
    create: {
      id: authId,
      email: email || null,
      name: name || null,
      avatarUrl: avatarUrl || null,
    },
  });
}

// Guarantees the UserProfile FK target row exists before a write that depends on it.
// JWT already verified userId via getUserId(); no Clerk fetch needed.
// Email/name are backfilled later by the Clerk webhook.
export async function ensureUserProfile(userId: string): Promise<void> {
  await prisma.userProfile.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  });
}

// Hard-deletes the profile; FK onDelete: Cascade removes all user-scoped rows.
// Uses deleteMany so replayed webhook events (no row) are a no-op.
export async function deleteUserProfile(userId: string): Promise<void> {
  await prisma.userProfile.deleteMany({ where: { id: userId } });
}

// Pulls the failing FK constraint name out of a P2003, across both the PrismaPg
// driver-adapter shape (constraint nested under driverAdapterError.cause) and the
// classic field_name/constraint forms, falling back to the message text.
function fkConstraintName(e: Prisma.PrismaClientKnownRequestError): string {
  const meta = e.meta as
    | {
        driverAdapterError?: { cause?: { constraint?: { index?: string } } };
        constraint?: string;
        field_name?: string;
      }
    | undefined;
  return (
    meta?.driverAdapterError?.cause?.constraint?.index ??
    meta?.constraint ??
    meta?.field_name ??
    e.message
  );
}

// True only when a write failed because the UserProfile FK target is missing
// (constraint `<table>_userId_fkey`). Other FK failures (e.g. a missing
// `<table>_sourceId_fkey` passage) are real bugs and must NOT match.
export function isMissingUserProfileFk(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2003" &&
    fkConstraintName(e).includes("_userId_fkey")
  );
}

// Runs an FK-creating write optimistically. The profile almost always already
// exists (webhook sync + first dashboard render), so the common path adds zero
// DB round-trips. Only on the new-user race — the write hits a missing UserProfile
// FK — do we create the row and retry once. The first attempt inserted nothing
// (FK rejected before commit), so the retry is clean.
export async function withUserProfile<T>(
  userId: string,
  write: () => Promise<T>,
): Promise<T> {
  try {
    return await write();
  } catch (e) {
    if (isMissingUserProfileFk(e)) {
      // A persistently hot heal path signals a broken/lagging Clerk webhook,
      // not a one-off first-write race — so this is worth a warning.
      log.warn(
        { userId },
        "Missing UserProfile FK on write; ensuring profile and retrying",
      );
      await ensureUserProfile(userId);
      return await write();
    }
    throw e;
  }
}
