import { AuthShell } from "@/components/layout/AuthShell";
import { ResendPanel } from "./ResendPanel";

// Server Component reading the query params app/create-account/page.tsx and
// app/auth/confirm/route.ts (on an expired/invalid link) set. No session check here — this page is
// intentionally reachable pre-session, since it's shown BEFORE the user has proven ownership of
// their email (that's the whole point of the page).
export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { email?: string; error?: string };
}) {
  return (
    <AuthShell
      image="/images/stitch/dress-form-draping.png"
      imageAlt="A dress form sketch draped in flowing blush and gold fabric, atelier study"
      quote="“One click, and my design world opened up.”"
    >
      <ResendPanel email={searchParams.email ?? ""} initialError={searchParams.error} />
    </AuthShell>
  );
}
