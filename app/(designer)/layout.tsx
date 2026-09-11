import { DesignerNavbar } from "@/components/layout/DesignerNavbar";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/supabase/authorization";
import { getOwnDesignerIdentity } from "@/lib/designer/data";
import { getSubscriptionAccess } from "@/lib/subscription-access";

// Real data (Phase 7 fix) — the DesignerNavbar and subscription gate used to be driven entirely by
// the seeded mock designer, disconnected from whoever was actually signed in. Resolved once, here,
// server-side, and passed down — no client-side loading state needed for either.
//
// Uses the non-throwing getAuthContext() rather than requireDesigner(): middleware (lib/auth/
// routes.ts) is the actual gate for this route group and deliberately allows a signed-in user
// onto these pages before their designer_profiles row exists yet (mid-onboarding); this layout
// must render gracefully in that same window, not hard-crash with an unstyled error page.
export default async function DesignerLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  const supabase = createClient();
  const [identity, access] =
    ctx && ctx.designerId
      ? await Promise.all([getOwnDesignerIdentity(supabase, ctx.user.id, ctx.designerId), getSubscriptionAccess(supabase, ctx.user.id, "designer")])
      : [{ name: "", avatar: "" }, { hasAccess: true, plan: null }];

  return (
    <div className="min-h-screen flex flex-col">
      <DesignerNavbar name={identity.name} avatar={identity.avatar} />
      <main className="flex-1">
        <SubscriptionGate role="designer" hasAccess={access.hasAccess} plan={access.plan} subscribeHref="/designer-subscription">
          {children}
        </SubscriptionGate>
      </main>
    </div>
  );
}
