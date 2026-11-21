import { withTransaction } from "@/server/lib/db";
import { lockProfile } from "@/server/modules/profile";
import { findDefaultSetId, upsertDefaultSet } from "./sets/vocabulary-set-repository";

const DEFAULT_SET_NAME = "Mặc định";

/**
 * Id of the set that holds the words the user has not filed anywhere else.
 * Created on first use; the user may rename it but not delete it.
 */
export async function ensureDefaultSetForUser(userId: string): Promise<string> {
  const existing = await findDefaultSetId(userId);
  if (existing) return existing;

  return withTransaction(async (tx) => {
    // Profile row lock: two first requests must not each create a default set.
    await lockProfile(userId, tx);
    const created = await findDefaultSetId(userId, tx);
    if (created) return created;

    // A set the user already named like the default becomes the default.
    return upsertDefaultSet(userId, DEFAULT_SET_NAME, tx);
  });
}
