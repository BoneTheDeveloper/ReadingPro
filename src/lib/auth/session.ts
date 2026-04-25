import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { AppError } from "@/lib/error/app-error";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requirePageSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireApiSession() {
  const session = await getSession();
  if (!session) throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  return session;
}
