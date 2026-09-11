"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Verification { profileReviewNote?: string }

// Real data (Phase 7 fix) — this page used to always read the seeded mock "pending designer"'s
// rejection note (PENDING_DESIGNER_ID from lib/store.ts) no matter who was signed in. It now reads
// the CURRENT signed-in designer's own verification row via the real Phase 5 GET route.
export default function VerificationRejectedPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [verification, setVerification] = useState<Verification | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/designer/verification");
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Couldn't load your verification status.");
        setVerification(data.verification);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-16">
      <div className="w-16 h-16 rounded-full bg-error-container text-error flex items-center justify-center mb-8">
        <XCircle size={26} />
      </div>
      <p className="text-label-md text-outline mb-3">VERIFICATION NOT APPROVED</p>
      <h1 className="text-headline-md max-w-md mb-4">We couldn't verify your profile</h1>
      <div className="bg-surface-low rounded-md p-5 max-w-sm text-left mb-8">
        <p className="text-xs text-outline mb-1">REASON</p>
        {status === "loading" ? (
          <div className="flex items-center gap-2 text-ink-variant text-sm">
            <Loader2 className="animate-spin" size={14} /> Loading…
          </div>
        ) : (
          <p className="text-sm text-ink-variant">
            {verification?.profileReviewNote || "Please review your submitted information and try again."}
          </p>
        )}
      </div>
      <Button onClick={() => router.push("/designer-onboarding")}>Update & Resubmit</Button>
    </div>
  );
}
