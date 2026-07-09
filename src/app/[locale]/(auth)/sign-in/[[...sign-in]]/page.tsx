import { SignInForm } from "@/components/auth/sign-in-form";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md px-4">
        <SignInForm redirectUrl={`/${locale}`} />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <a
            href={`/${locale}/sign-up`}
            className="text-primary hover:underline"
          >
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
