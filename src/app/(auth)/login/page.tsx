import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "@/component/auth/login-form";

export default async function SignInPage() {
  const session = await getSession();
  if (session) redirect("/study");

  return <LoginForm signInLabel="Đăng nhập" />;
}
