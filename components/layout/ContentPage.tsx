import Link from "next/link";
import { Footer } from "@/components/layout/Footer";

// Shared shell for standalone content pages (Help Center, Contact Support, Privacy Policy, Terms
// of Use, About HRUNA) — matches the existing top-level public-page pattern (e.g.
// app/become-a-designer/page.tsx: no Navbar, just content + Footer) rather than inventing a new
// layout convention.
export function ContentPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container-editorial py-16 flex-1">
        <Link href="/" className="font-display text-2xl inline-block mb-12">
          HRUNA
        </Link>
        <div className="max-w-2xl">
          <p className="text-label-md text-outline mb-2">{eyebrow}</p>
          <h1 className="text-headline-md mb-8">{title}</h1>
          <div className="flex flex-col gap-6 text-sm text-ink-variant leading-relaxed">{children}</div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
