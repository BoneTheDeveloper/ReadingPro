import { AuthPageShell, LoginForm, redirectIfSignedIn } from "@/client/features/auth";

export const clientLoader = redirectIfSignedIn;

export default function LoginRoute() {
  return (
    <AuthPageShell>
      <LoginForm />
    </AuthPageShell>
  );
}
