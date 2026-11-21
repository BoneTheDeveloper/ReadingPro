import { redirect } from "react-router";
import { authClient } from "@/client/lib/auth/auth-client";

/** clientLoader for the sign-in and sign-up pages: a signed-in visitor goes straight to the app. */
export async function redirectIfSignedIn() {
  const { data: session } = await authClient.getSession();
  if (session) throw redirect("/study");
  return null;
}
