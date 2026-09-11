import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="font-display text-6xl mb-4">404</p>
      <h1 className="text-headline-md mb-3">This page hasn't been designed yet</h1>
      <p className="text-ink-variant mb-8 max-w-sm">The page you're looking for doesn't exist or may have moved.</p>
      <LinkButton href="/home">Back to Home</LinkButton>
    </div>
  );
}
