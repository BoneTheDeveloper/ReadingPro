import { redirect } from "next/navigation";
import { getPageSession } from "@/lib/auth/page-session";
import { LoginForm } from "@/component/auth/login-form";

export default async function SignInPage() {
  const session = await getPageSession();
  if (session) redirect("/study");

  return <LoginForm signInLabel="Đăng nhập" />;
}
