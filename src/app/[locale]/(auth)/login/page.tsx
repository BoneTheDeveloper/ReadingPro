import { getMessages, getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/components/login-form";
import type { AuthTranslations } from "@/components/auth/components/login-form";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: _locale } = await params;
  const [messages, t] = await Promise.all([
    getMessages(),
    getTranslations(),
  ]);

  return (
    <LoginForm
      translations={{
        auth: messages.Auth as AuthTranslations,
        common: messages.Common as Record<string, string>,
      }}
      signInLabel={t("Auth.signInTitle")}
    />
  );
}
