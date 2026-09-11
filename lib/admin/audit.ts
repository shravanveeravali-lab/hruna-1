import "server-only";

/**
 * The one place every admin mutation writes to admin_audit_log (§18/§28). Uses the AUTHENTICATED
 * admin's own server client — admin_audit_log_insert_admin RLS (supabase/migrations/
 * 20260829180013_rls.sql) already allows this directly, no service-role needed. admin_id always
 * comes from the caller's own resolved session (never trusted from a parameter), so an audit
 * entry can never be attributed to the wrong admin.
 *
 * admin_audit_log has no update/delete RLS policy for ANY role (§19's "immutability" requirement
 * is already a database guarantee, not something this helper has to additionally enforce).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Supa = SupabaseClient<Database>;

export async function logAdminAction(
  supabase: Supa,
  adminUserId: string,
  entry: {
    subjectType: "designer" | "customer" | "platform";
    subjectId?: string | null;
    action: string;
    reason?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("admin_audit_log").insert({
    admin_id: adminUserId,
    subject_type: entry.subjectType,
    subject_id: entry.subjectId ?? null,
    action: entry.action,
    reason: entry.reason ?? null,
  });
  // Never let a logging failure block the actual admin action that already succeeded — but it
  // must still be visible server-side, so it can be investigated rather than silently vanishing.
  if (error) console.error("[admin:audit-log] failed to record action", entry.action, error);
}
