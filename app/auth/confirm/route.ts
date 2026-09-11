/**
 * Landing route for both signup-confirmation and password-recovery email links. This is the ONLY
 * place in the app that turns "clicked the link Supabase emailed" into a real, cookie-persisted
 * Supabase session — which is exactly what makes it impossible to reach /setup-password without
 * having actually proven ownership of the email address the link was sent to (see
 * app/setup-password/page.tsx's session guard, and lib/auth/routes.ts's route classification).
 *
 * Uses `token_hash` + `supabase.auth.verifyOtp({ type, token_hash })`, NOT
 * `exchangeCodeForSession(code)` (the PKCE flow @supabase/ssr defaults to). PKCE's code exchange
 * requires the code-verifier cookie set in the SAME browser that started signUp()/
 * resetPasswordForEmail() — it breaks whenever the email is opened in a different browser/device
 * (a webmail app, "open link" from a phone), which is a completely normal way to open an email.
 * token_hash verification has no such requirement — this is Supabase's own documented approach for
 * confirmation/recovery links specifically. See supabase/templates/confirmation.html and
 * recovery.html, which build the link this route reads.
 *
 * `type` (`"signup"` vs `"recovery"`) is also how a signup confirmation is told apart from a
 * password-recovery click — both are handled here, since the operation (verify the token, get a
 * session) is identical; only the destination differs.
 */

import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, request.url));

  // Deliberately ignores any `next`/redirect query param a link might carry — accepting an
  // arbitrary client-supplied redirect target here would be an open-redirect hole. The destination
  // is decided purely by the server-validated `type`, below.
  if (!token_hash || !type) {
    return redirectTo("/create-account?error=invalid-link");
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    return redirectTo(type === "recovery" ? "/forgot-password?error=expired" : "/create-account?error=expired");
  }

  return redirectTo(type === "recovery" ? "/reset-password" : "/setup-password");
}
