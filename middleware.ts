import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Session refresh + route protection — see lib/supabase/middleware.ts (the enforcement logic) and
 * lib/auth/routes.ts (the route classifier) for what this does and its documented scope
 * boundaries. Public pages (landing, Discover, login, etc.) stay reachable to visitors exactly as
 * before; authenticated/customer/designer/admin routes now require a real Supabase session (and,
 * for /admin, a real is_admin=true database row).
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every request except static assets and image files, which never need a session
     * refresh. Keeping this broad (rather than an allowlist of specific app routes) is what
     * makes "protected routes can later be enforced" possible in Phase 3 without having to
     * remember to add new pages to a list here.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
