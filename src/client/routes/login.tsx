import { redirect } from "react-router";
import { authClient } from "@/client/lib/auth/auth-client";
import { LoginForm } from "@/client/features/auth";

export async function clientLoader() {
  const { data: session } = await authClient.getSession();
  if (session) throw redirect("/study");
  return null;
}

export default function LoginRoute() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[320px]">
        <LoginForm signInLabel="Đăng nhập" />
      </div>
    </div>
  );
}
