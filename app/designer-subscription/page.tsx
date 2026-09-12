import { SubscriptionPageContent } from "@/components/subscription/SubscriptionPageContent";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/supabase/authorization";
import { getSubscriptionSummary } from "@/lib/subscription-access";

export default async function DesignerSubscriptionPage() {
  const ctx = await getAuthContext();
  const supabase = createClient();
  const summary = ctx
    ? await getSubscriptionSummary(supabase, ctx.user.id, "designer")
    : { enforced: false, plan: null, subscription: null };

  return (
    <SubscriptionPageContent
      role="designer"
      summary={summary}
      brandLabel="HRUNA STUDIO"
      backHref="/designer/home"
    />
  );
}
