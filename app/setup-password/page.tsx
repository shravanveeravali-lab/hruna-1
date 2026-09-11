import { redirect } from "next/navigation";
import { AuthShell } from "@/components/layout/AuthShell";
import { PasswordForm } from "@/components/auth/PasswordForm";
import { getAuthContext } from "@/lib/supabase/authorization";

// Server Component guard — this is what makes it impossible to reach this page just by knowing the
// URL. Two layers, both enforced server-side (never just hidden client-side UI):
//   1. lib/auth/routes.ts classifies /setup-password as "authenticated" — middleware already
//      bounces a sessionless visitor to /login before this component even renders.
//   2. Below: getAuthContext() re-checks for defense-in-depth, AND checks user_metadata.
//      password_set — a valid session alone doesn't say whether this identity already has a real
//      password (e.g. someone who finished setup once, then navigates back here) — that's not
//      something middleware's route classifier can express, only this page-level check.
// The only legitimate way to arrive here with a session but password_set !== true is having just
// clicked a signup confirmation link (app/auth/confirm/route.ts's verifyOtp() call), which is
// exactly the "proved ownership of this email" guarantee the whole redesign exists to enforce.
export default async function SetupPasswordPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login?next=/setup-password");
  if (ctx.user.user_metadata?.password_set === true) redirect("/choose-role");

  return (
    <AuthShell
      image="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=1200&q=80"
      imageAlt="A designer at work in their studio"
      quote="“The last step before LILIRVE became mine — choosing a password felt like signing my own name.”"
    >
      <PasswordForm
        heading="Create your password"
        description="Your email is verified. Set a password to finish creating your LILIRVE account."
        submitLabel="Create account"
        onSuccessRedirect="/choose-role"
      />
    </AuthShell>
  );
}
