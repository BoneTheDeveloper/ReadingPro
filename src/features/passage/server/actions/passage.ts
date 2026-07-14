"use server";

import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/auth/auth-server";
import { deletePassage } from "@/features/passage/server/db/passage";

export async function deletePassageAction(passageId: string) {
  const userId = await getUserId();
  await deletePassage(passageId, userId);
  revalidatePath("/study");
}
