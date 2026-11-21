import { AuthPageShell, RegisterForm, redirectIfSignedIn } from "@/client/features/auth";

export const clientLoader = redirectIfSignedIn;

export default function RegisterRoute() {
  return (
    <AuthPageShell>
      <RegisterForm />
    </AuthPageShell>
  );
}
