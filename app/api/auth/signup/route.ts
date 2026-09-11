/**
 * TEMPORARY DEVELOPMENT FLOW: creates an already-confirmed auth.users row with a real, user-chosen
 * password and signs the caller in immediately — no email verification step. This intentionally
 * does NOT prove ownership of the entered email address; that's explicitly accepted for now. See
 * "Restoring real email verification later" below for how to reverse this cleanly.
 *
 * WHY auth.admin.createUser() INSTEAD OF auth.signUp():
 * The public, anon-key signUp() endpoint is gated by the hosted Supabase project's own "Confirm
 * email" setting (Dashboard → Authentication → Providers → Email) — when that's ON, GoTrue always
 * attempts to send a confirmation email as PART OF the signUp() call itself, and (because this
 * project's default mail transport can't currently deliver — see the earlier "Error sending
 * confirmation email" investigation) the whole call fails with a 500, regardless of anything this
 * route sends. No application code or request payload can turn that project-level requirement off
 * for the public endpoint — only a Dashboard change or Custom SMTP can, and neither is available
 * right now.
 *
 * auth.admin.createUser() is a DIFFERENT, genuine, documented Supabase Admin API method (not a
 * workaround or fake verification system) built specifically for privileged/administrative account
 * creation — CSV imports, admin-provisioned accounts, and cases like this one. Its `email_confirm:
 * true` option creates the user already confirmed and, being an admin operation rather than the
 * public self-serve flow, never attempts to send any mail at all — confirmed directly against this
 * project (see the session's diagnostic run: zero error, `email_confirmed_at` populated
 * immediately, no send attempt). This bypasses the "Confirm email" gate entirely rather than
 * disabling it, and touches nothing else — no schema, no RLS, no other security mechanism.
 *
 * admin.createUser() itself never touches the caller's browser session (it's a service-role
 * operation, disconnected from any request's cookies) — so the real session is established
 * immediately afterward with an ordinary signInWithPassword() call, exactly the same call
 * app/api/auth/login/route.ts already uses, via the cookie-writing lib/supabase/server.ts client.
 *
 * SECURITY NOTE: because this goes through the Admin API rather than the public signUp() endpoint,
 * Supabase's own signup-specific abuse protections (e.g. the `sign_in_sign_ups` rate limit, CAPTCHA
 * if configured) do not apply to this path. The app-level duplicate-account check below is
 * unaffected and remains the active protection against re-registering an existing identity.
 *
 * RESTORING REAL EMAIL VERIFICATION LATER: swap the admin.createUser()+signInWithPassword() pair
 * below back for a plain supabase.auth.signUp({ email, password, options: { emailRedirectTo: ...,
 * data: { full_name: name } } }) call (email_confirm/password_set stay unset), and point
 * app/create-account/page.tsx's success handler at /verify-email instead of /choose-role.
 * app/auth/confirm/route.ts and app/setup-password/page.tsx were never touched and still work.
 *
 * Duplicate-account check: unchanged — a service-role lookup (must run pre-session, before there's
 * an auth.uid() for RLS to scope by) for an existing public.users row with a completed customer or
 * designer profile, so a genuine first-time visitor gets a clear "sign in instead" message instead
 * of a confusing generic error.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse } from "@/lib/supabase/errors";
import { validatePasswordConfirmation } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

const ALREADY_EXISTS_MESSAGE = "An account with this email already exists. Please sign in instead.";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";

    if (!name) {
      return NextResponse.json({ status: "error", message: "Enter your full name." }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ status: "error", message: "Enter a valid email address." }, { status: 400 });
    }
    const passwordError = validatePasswordConfirmation(password, confirmPassword);
    if (passwordError) {
      return NextResponse.json({ status: "error", message: passwordError }, { status: 400 });
    }

    // Service-role: this is a genuinely new visitor with no session yet, so there's no auth.uid()
    // for RLS to scope a read by. Read-only, and only ever returns a boolean-shaped 409 to the
    // client, never any profile data.
    const admin = createAdminClient();
    const { data: existingUser } = await admin.from("users").select("id").eq("email", email).maybeSingle();
    if (existingUser) {
      const [{ count: customerCount }, { count: designerCount }] = await Promise.all([
        admin.from("customer_profiles").select("id", { count: "exact", head: true }).eq("user_id", existingUser.id),
        admin.from("designer_profiles").select("id", { count: "exact", head: true }).eq("user_id", existingUser.id),
      ]);
      if ((customerCount ?? 0) > 0 || (designerCount ?? 0) > 0) {
        return NextResponse.json({ status: "error", message: ALREADY_EXISTS_MESSAGE }, { status: 409 });
      }
    }

    // Admin-created, pre-confirmed — see file comment for why this (not signUp()) is used. Never
    // attempts to send mail. `password_set: true` matches what the real-verification flow's
    // app/api/auth/set-password/route.ts sets, so app/setup-password/page.tsx's guard and
    // app/create-account/page.tsx's already-authenticated redirect both keep working unchanged.
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, password_set: true },
    });
    if (createError) {
      // Admin creation reports an existing email directly (unlike signUp()'s enumeration-avoidance
      // heuristic) — covers the one case the profile-based check above can't: an auth user that
      // completed signup previously but never finished onboarding (no customer/designer profile).
      if (createError.code === "email_exists" || /already registered|already exists/i.test(createError.message)) {
        return NextResponse.json(
          {
            status: "error",
            message:
              "An account with this email already exists. Please sign in — if you don't remember a password, use ‘Forgot password?’ on the sign-in page.",
          },
          { status: 409 }
        );
      }
      throw createError;
    }

    // Establish the actual browser session — admin.createUser() never touches cookies. Same call
    // app/api/auth/login/route.ts already uses; the password just set is what's being verified here.
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;

    // Best-effort: persist the name into the existing public.users.display_name column. The row
    // already exists — auto-provisioned by the on_auth_user_created trigger the moment
    // admin.createUser() ran — and users_update_self RLS (id = auth.uid()) permits this ordinary,
    // now-authenticated, request-scoped write.
    if (created.user) {
      await supabase.from("users").update({ display_name: name }).eq("id", created.user.id);
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.auth.signup");
  }
}
