// Next server components only. Kept apart from session.ts so the API server
// bundle never imports next/*.
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "./session";

export const getPageSession = cache(async () => getSession(await headers()));

export async function requirePageSession() {
  const session = await getPageSession();
  if (!session) redirect("/login");
  return session;
}
