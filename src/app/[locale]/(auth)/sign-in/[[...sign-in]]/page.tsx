import { SignIn } from "@clerk/nextjs";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <SignIn
      routing="path"
      path={`/${locale}/sign-in`}
      signUpUrl={`/${locale}/sign-up`}
      fallbackRedirectUrl={`/${locale}`}
    />
  );
}
