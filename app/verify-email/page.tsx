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
      image="https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=1200&q=80"
      imageAlt="Fabric swatches and sketches laid out on a design studio table"
      quote="“One click, and my design world opened up.”"
    >
      <ResendPanel email={searchParams.email ?? ""} initialError={searchParams.error} />
    </AuthShell>
  );
}
