"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { deletePassageById, getOwnedPassage } from "@/features/passage-crud";
import { getViewableUrl } from "@/infrastructure/storage/index";

export async function deletePassageAction(passageId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  await deletePassageById(passageId, session.user.id);
  revalidatePath("/study");
}

export async function getPassageSourceUrlAction(passageId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  const passage = await getOwnedPassage(session.user.id, passageId);

  if (!passage || !passage.filePath) {
    return null;
  }

  return getViewableUrl(passage.filePath);
}
