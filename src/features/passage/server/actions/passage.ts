"use server";

import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/auth/auth-server";
import { deletePassageById } from "@/features/passage";

export async function deletePassageAction(passageId: string) {
  const userId = await getUserId();
  await deletePassageById(passageId, userId);
  revalidatePath("/study");
}
