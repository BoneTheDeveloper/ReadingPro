import { SignUpForm } from "@/components/auth/sign-up-form";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md px-4">
        <SignUpForm redirectUrl={`/${locale}`} />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a
            href={`/${locale}/sign-in`}
            className="text-primary hover:underline"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
