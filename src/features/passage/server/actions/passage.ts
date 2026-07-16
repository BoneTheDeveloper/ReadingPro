"use server";

import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/auth/auth-server";
import { deletePassageById, getOwnedPassage } from "@/features/passage";
import { getViewableUrl } from "@/infrastructure/storage/index";

export async function deletePassageAction(passageId: string) {
  const userId = await getUserId();
  await deletePassageById(passageId, userId);
  revalidatePath("/study");
}

export async function getPassageSourceUrlAction(passageId: string) {
  const userId = await getUserId();
  const passage = await getOwnedPassage(userId, passageId);

  if (!passage || !passage.filePath) {
    return null;
  }

  return getViewableUrl(passage.filePath);
}
