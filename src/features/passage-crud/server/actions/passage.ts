"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { deletePassageById } from "@/features/passage-crud";

export async function deletePassageAction(passageId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  await deletePassageById(passageId, session.user.id);
  revalidatePath("/study");
}
