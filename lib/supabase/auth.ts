import "server-only";

/**
 * Minimal server-side session retrieval — the foundation piece this phase asks for, not the full
 * authentication/RBAC system (that's Phase 3). This answers exactly one question: "is there an
 * authenticated user, and if so, what's their auth identity (id/email)?" It does NOT resolve
 * which customer_profiles/designer_profiles row that maps to, and it does NOT check is_admin —
 * both of those are role/permission concerns for Phase 3, deliberately not built here.
 */

import { createClient } from "./server";

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    // Not authenticated is the overwhelmingly common "error" here (no session cookie) — that's
    // an expected, silent case, not a failure worth logging. A genuinely unexpected auth error
    // still surfaces to the caller as "no user," which is the safe default either way.
    return null;
  }

  return user;
}
