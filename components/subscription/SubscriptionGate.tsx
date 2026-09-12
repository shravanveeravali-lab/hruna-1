import { Lock } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

// Presentational only (Phase 7 fix) — hasAccess/plan are now computed server-side from the REAL
// payment_settings/user_subscriptions tables (see lib/subscription-access.ts) by the layout that
// renders this, instead of this component reading the mock store itself.
export function SubscriptionGate({
  role,
  hasAccess,
  plan,
  subscribeHref,
  children,
}: {
  role: "customer" | "designer";
  hasAccess: boolean;
  plan: { name: string; price: number; currency: string } | null;
  subscribeHref: string;
  children: React.ReactNode;
}) {
  if (hasAccess) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-16">
      <div className="w-16 h-16 rounded-full bg-primary-container text-primary flex items-center justify-center mb-8">
        <Lock size={24} />
      </div>
      <p className="text-label-md text-outline mb-3">SUBSCRIPTION REQUIRED</p>
      <h1 className="text-headline-md max-w-md mb-4">
        Your {role === "customer" ? "HRUNA" : "HRUNA Studio"} subscription has ended
      </h1>
      <p className="text-ink-variant max-w-sm mb-8">
        {plan
          ? `Subscribe to ${plan.name} (${formatCurrency(plan.price, plan.currency)}/month) to continue using HRUNA.`
          : "A subscription is required to continue using HRUNA."}
      </p>
      <LinkButton href={subscribeHref} size="lg">View Subscription</LinkButton>
    </div>
  );
}
