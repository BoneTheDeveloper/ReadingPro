import { getMessages, getTranslations } from "next-intl/server";
import { SignUpForm } from "@/components/auth/components/signup-form";
import type { AuthTranslations } from "@/components/auth/components/signup-form";

export default async function SignUpPage({
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
    <SignUpForm
      translations={{
        auth: messages.Auth as AuthTranslations,
        common: messages.Common as Record<string, string>,
      }}
      signUpLabel={t("Auth.signUpTitle")}
    />
  );
}
