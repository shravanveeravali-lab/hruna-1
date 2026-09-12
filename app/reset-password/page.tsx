import { redirect } from "next/navigation";
import { AuthShell } from "@/components/layout/AuthShell";
import { PasswordForm } from "@/components/auth/PasswordForm";
import { getAuthContext } from "@/lib/supabase/authorization";

// Same guard shape as app/setup-password/page.tsx, minus the password_set branch: arriving here
// with ANY valid session is sufficient, because the only way to get one is either being already
// signed in, or having just clicked a password-recovery link (app/auth/confirm/route.ts's
// verifyOtp({ type: "recovery" }) call) — both are legitimate reasons to be allowed to set a new
// password for this identity. lib/auth/routes.ts classifies /reset-password as "authenticated", so
// middleware already bounces a sessionless visitor before this component renders; the check below
// re-confirms server-side and gives an accurate redirect (back to /forgot-password) rather than a
// generic /login bounce, since "my recovery link expired" is a different situation than "I'm not
// signed in at all".
export default async function ResetPasswordPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/forgot-password?error=session-expired");

  return (
    <AuthShell>
      <PasswordForm
        heading="Reset your password"
        description="Choose a new password for your HRUNA account."
        submitLabel="Reset password"
        onSuccessRedirect="/home"
      />
    </AuthShell>
  );
}
