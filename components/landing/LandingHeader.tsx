import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatedCTA } from "./AnimatedCTA";

const NAV_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/become-a-designer", label: "I'm a Designer" },
  { href: "/login", label: "Sign In" },
];

// The landing page's own header (separate from the shared authenticated-app Navbar/DesignerNavbar).
// Simplified for the v4 scrapbook redesign: the hero is now a light cream/gingham paper background
// rather than a dark full-bleed photo, so the header no longer needs to float transparently over
// it or swap colors on scroll — it's just a plain sticky cream bar, no client JS required.
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 bg-scrapbook-cream border-b border-scrapbook-forest/10">
      <div className="container-editorial flex items-center justify-between py-5">
        <Link href="/" className="font-display text-2xl tracking-[0.25em] text-scrapbook-forest">
          HRUNA
        </Link>

        <nav className="hidden md:flex items-center gap-10 text-sm text-scrapbook-forest/80">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="group relative inline-block py-1">
              {label}
              <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-scrapbook-forest transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <AnimatedCTA href="/create-account" size="md" className="bg-scrapbook-forest text-scrapbook-cream hover:bg-scrapbook-forest/90 group">
            Join HRUNA
            <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
          </AnimatedCTA>
        </div>
      </div>
    </header>
  );
}
