import { AuthShell } from "@/components/layout/AuthShell";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

// Real password-recovery flow, replacing the old static "LILIRVE doesn't have passwords" stub now
// that it does. Uses Supabase's own resetPasswordForEmail() (via app/api/auth/forgot-password/
// route.ts) — a completely separate mechanism from signup email verification (different email
// type/template, different landing destination via app/auth/confirm/route.ts's `type=recovery`
// branch → /reset-password).
export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <AuthShell>
      <ForgotPasswordForm initialError={searchParams.error} />
    </AuthShell>
  );
}
