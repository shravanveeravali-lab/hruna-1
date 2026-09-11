"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ForgotPasswordForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(
    initialError === "expired"
      ? "That reset link has expired or was already used. Request a new one below."
      : initialError === "session-expired"
        ? "That reset link is no longer valid. Request a new one below."
        : ""
  );
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Enter your email address to continue.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Something went wrong. Please try again.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-8">
        <h1 className="text-headline-sm">Check your email</h1>
        <p className="text-sm text-ink-variant max-w-xs">
          If an account exists for <span className="text-ink font-medium">{email}</span>, we&apos;ve sent a
          password reset link.
        </p>
        <Link href="/login" className="text-primary font-medium hover:underline mt-2">
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-label-md text-outline mb-2">RESET PASSWORD</p>
      <h1 className="text-headline-md mb-3">Forgot your password?</h1>
      <p className="text-sm text-ink-variant mb-8">
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Field label="Email address" htmlFor="email" required error={error}>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Button type="submit" className="w-full mt-2" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="text-sm text-ink-variant mt-8 text-center">
        <Link href="/login" className="text-primary font-medium hover:underline">
          ← Back to sign in
        </Link>
      </p>
    </>
  );
}
