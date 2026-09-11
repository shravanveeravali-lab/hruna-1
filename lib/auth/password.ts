/**
 * Shared client+server password validation. Deliberately plain functions with manual checks — no
 * zod anywhere in this codebase, and this is the one rule small enough not to need it.
 *
 * The 8-char floor here is intentionally stricter than supabase/config.toml's
 * `minimum_password_length = 6`, so this check always fires first and Supabase's own policy never
 * has anything left to reject — but `updateUser({ password })`'s error is still surfaced as-is if
 * it ever does (e.g. a future `password_requirements` tightening), never swallowed.
 */
export function validatePassword(password: string): string | null {
  if (!password) return "Enter a password.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export function validatePasswordConfirmation(password: string, confirm: string): string | null {
  return validatePassword(password) ?? (password !== confirm ? "Passwords do not match." : null);
}
