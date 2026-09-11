"use client";

/**
 * Browser Supabase client — for Client Components only ("use client"). Uses the public anon key,
 * which is safe to ship to the browser: every table has Row Level Security enabled (see
 * supabase/migrations/20260829180013_rls.sql), so the anon key alone never grants access to
 * anything a policy doesn't explicitly allow.
 *
 * Call this once per component that needs it — createBrowserClient() is cheap and designed to be
 * called freely; it reuses the same underlying auth state via the browser's storage, it does not
 * open a new connection each time.
 */

import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";
import type { Database } from "./types";

export function createClient() {
  return createBrowserClient<Database>(supabaseConfig.url(), supabaseConfig.anonKey());
}
