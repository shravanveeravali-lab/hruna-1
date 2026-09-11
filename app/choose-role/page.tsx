"use client";

import { useRouter } from "next/navigation";
import { ShoppingBag, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChooseRolePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <p className="font-display text-2xl mb-2">LILIRVE</p>
      <p className="text-label-md text-outline mb-10 text-center">YOUR ACCOUNT IS READY</p>
      <h1 className="text-headline-md text-center max-w-md mb-12">How would you like to use LILIRVE?</h1>

      <div className="grid sm:grid-cols-2 gap-6 w-full max-w-2xl">
        <button
          onClick={() => router.push("/onboarding")}
          className={cn(
            "flex flex-col items-start gap-4 p-8 rounded-md border border-outline-variant text-left hover:border-primary hover:shadow-soft transition-all"
          )}
        >
          <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-primary">
            <ShoppingBag size={20} />
          </div>
          <div>
            <p className="font-display text-xl mb-1">Commission Fashion</p>
            <p className="text-sm text-ink-variant">Discover designers, request custom pieces, and track your projects.</p>
          </div>
        </button>

        <button
          onClick={() => router.push("/designer-onboarding")}
          className={cn(
            "flex flex-col items-start gap-4 p-8 rounded-md border border-outline-variant text-left hover:border-primary hover:shadow-soft transition-all"
          )}
        >
          <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-primary">
            <Scissors size={20} />
          </div>
          <div>
            <p className="font-display text-xl mb-1">Showcase My Craft</p>
            <p className="text-sm text-ink-variant">Set up your studio as a designer, boutique or tailor and receive requests.</p>
          </div>
        </button>
      </div>

      <p className="text-xs text-outline mt-10 text-center max-w-sm">
        You can always set up the other side of LILIRVE later from your account settings.
      </p>
    </div>
  );
}
