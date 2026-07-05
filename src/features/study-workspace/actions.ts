"use server";

import { revalidatePath } from "next/cache";
import { getUserId } from "@/server/auth/auth-utils";
import { deletePassage } from "@/server/db/passage-queries";

export async function deletePassageAction(passageId: string) {
  const userId = await getUserId();
  await deletePassage(passageId, userId);
  revalidatePath("/study");
}
