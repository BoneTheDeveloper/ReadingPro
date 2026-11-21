import { AuthPageShell, ForgotPasswordForm, redirectIfSignedIn } from "@/client/features/auth";

export const clientLoader = redirectIfSignedIn;

export default function ForgotPasswordRoute() {
  return (
    <AuthPageShell>
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
