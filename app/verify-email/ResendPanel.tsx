"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";

const RESEND_SECONDS = 30;

export function ResendPanel({ email, initialError }: { email: string; initialError?: string }) {
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState(
    initialError === "expired"
      ? "That verification link has expired or was already used. Request a new one below."
      : initialError === "invalid-link"
        ? "That verification link isn't valid. Request a new one below."
        : ""
  );

  useEffect(() => {
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const handleResend = async () => {
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Something went wrong. Please try again.");
      setStatus("sent");
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center text-center gap-4 py-8">
      <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center text-primary">
        <Mail size={24} />
      </div>
      <p className="text-label-md text-outline">CHECK YOUR EMAIL</p>
      <h1 className="text-headline-sm">We sent a verification link to your email address</h1>
      {email && <p className="text-sm text-ink font-medium">{email}</p>}
      <p className="text-sm text-ink-variant max-w-xs">
        Please click the link in your email to continue creating your HRUNA account.
      </p>

      {message && (
        <p className={`text-xs ${status === "error" || initialError ? "text-error" : "text-outline"}`}>{message}</p>
      )}
      {status === "sent" && !message && (
        <p className="text-xs text-outline">A new verification link is on its way.</p>
      )}

      <Button
        onClick={handleResend}
        disabled={status === "sending" || resendIn > 0}
        variant="secondary"
        className="mt-2"
      >
        {status === "sending" ? "Sending…" : resendIn > 0 ? `Resend email in ${resendIn}s` : "Resend email"}
      </Button>

      <Link href="/create-account" className="text-sm text-primary hover:underline mt-4">
        ← Wrong email? Go back
      </Link>
    </div>
  );
}
