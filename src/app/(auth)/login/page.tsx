import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { LoginForm } from "@/components/auth/login-form";

export default async function SignInPage() {
  const session = await getSession();
  if (session?.user) {
    redirect("/study");
  }

  return <LoginForm signInLabel="Đăng nhập" />;
}