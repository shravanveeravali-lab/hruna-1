import "server-only";

/**
 * Server Supabase client — for Server Components, Route Handlers, and Server Actions. Reads/
 * writes the Supabase auth cookies via next/headers, so it sees the same authenticated session
 * a browser request carries (this is what lets a Server Component render "as" the signed-in
 * user, with RLS enforcing that user's own row-level access — not a privileged bypass).
 *
 * Next.js 14's `cookies()` is synchronous (this differs from Next 15+, where it's async) — keep
 * that in mind if this project's Next version ever moves.
 *
 * `setAll` is wrapped in try/catch per Supabase's own documented pattern: a Server Component
 * cannot write cookies (only Server Actions/Route Handlers can), and calling `.set()` there
 * throws. That's fine as long as `middleware.ts` is refreshing the session on every request —
 * see lib/supabase/middleware.ts — so we swallow that specific, expected failure rather than
 * letting it break rendering.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";
import type { Database } from "./types";

export function createClient(options?: { fetch?: typeof fetch }) {
  const cookieStore = cookies();

  return createServerClient<Database>(supabaseConfig.url(), supabaseConfig.anonKey(), {
    // `options?.fetch` is undefined for every existing caller, which is exactly the previous
    // behavior (createServerClient falls back to the runtime's global fetch) — this param exists
    // so one call site can opt into wrapping fetch (e.g. for diagnostic logging) without changing
    // anything for everyone else.
    global: options?.fetch ? { fetch: options.fetch } : undefined,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — expected and safe to ignore as long as
          // middleware.ts is refreshing sessions (see the file comment above).
        }
      },
    },
  });
}
