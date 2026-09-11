import { Navbar } from "@/components/layout/Navbar";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/supabase/authorization";
import { getOwnCustomerIdentity } from "@/lib/customer/data";
import { getSubscriptionAccess } from "@/lib/subscription-access";

// Real data (Phase 7 fix) — the Navbar and subscription gate used to be driven entirely by the
// seeded mock customer, disconnected from whoever was actually signed in. Resolved once, here,
// server-side, and passed down — no client-side loading state needed for either.
//
// Uses the non-throwing getAuthContext() rather than requireCustomer(): middleware (lib/auth/
// routes.ts) is the actual gate for this route group and deliberately allows a signed-in user
// onto these pages before their customer_profiles row exists yet (mid-onboarding); this layout
// must render gracefully in that same window, not hard-crash with an unstyled error page.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  const supabase = createClient();
  const [identity, access] = ctx
    ? await Promise.all([getOwnCustomerIdentity(supabase, ctx.user.id), getSubscriptionAccess(supabase, ctx.user.id, "customer")])
    : [{ name: "", avatar: "" }, { hasAccess: true, plan: null }];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar name={identity.name} avatar={identity.avatar} />
      <main className="flex-1">
        <SubscriptionGate role="customer" hasAccess={access.hasAccess} plan={access.plan} subscribeHref="/subscription">
          {children}
        </SubscriptionGate>
      </main>
    </div>
  );
}
