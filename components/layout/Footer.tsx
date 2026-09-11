import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/community-guidelines", label: "Community Guidelines" },
  { href: "/acceptable-use", label: "Acceptable Use" },
  { href: "/content-policy", label: "Content & Intellectual Property" },
  { href: "/collaboration-policy", label: "Collaboration Policy" },
  { href: "/reviews-policy", label: "Reviews & Ratings" },
  { href: "/reporting-and-disputes", label: "Reporting & Disputes" },
  { href: "/account-policy", label: "Account Policy" },
];

export function Footer() {
  return (
    <footer className="border-t border-scrapbook-cream/10 bg-scrapbook-forest text-scrapbook-cream/70">
      <div className="container-editorial py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <p className="font-display text-3xl tracking-[0.25em] text-scrapbook-cream mb-3">HRUNA</p>
          <p className="text-sm max-w-xs">
            A fashion scrapbook, brought to life — real designers, real pieces, made with intention.
          </p>
        </div>
        <div>
          <p className="text-label-md text-scrapbook-rose mb-4">Discover</p>
          <ul className="flex flex-col gap-3 text-sm">
            <li><Link href="/discover" className="hover:text-scrapbook-cream transition-colors">Designers</Link></li>
            <li><Link href="/discover" className="hover:text-scrapbook-cream transition-colors">Boutiques</Link></li>
            <li><Link href="/discover" className="hover:text-scrapbook-cream transition-colors">Tailors</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-label-md text-scrapbook-rose mb-4">For You</p>
          <ul className="flex flex-col gap-3 text-sm">
            <li><Link href="/requests/new" className="hover:text-scrapbook-cream transition-colors">Create a Request</Link></li>
            <li><Link href="/diary" className="hover:text-scrapbook-cream transition-colors">Fashion Diary</Link></li>
            <li><Link href="/requests" className="hover:text-scrapbook-cream transition-colors">My Requests</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-label-md text-scrapbook-rose mb-4">Company</p>
          <ul className="flex flex-col gap-3 text-sm">
            <li><Link href="/become-a-designer" className="hover:text-scrapbook-cream transition-colors">Become a Designer</Link></li>
            <li><Link href="/login" className="hover:text-scrapbook-cream transition-colors">Sign In</Link></li>
          </ul>
        </div>
      </div>

      {/* Kept as its own tier, separate from the main nav row above — 9 policy links alongside
          Support/About reads as a wall of links if squeezed into a single-row grid with the
          shorter columns above. */}
      <div className="container-editorial pb-16 grid grid-cols-2 md:grid-cols-4 gap-10 border-t border-scrapbook-cream/10 pt-12">
        <div className="col-span-2 md:col-span-2">
          <p className="text-label-md text-scrapbook-rose mb-4">Legal &amp; Policies</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {LEGAL_LINKS.map(({ href, label }) => (
              <li key={href}><Link href={href} className="hover:text-scrapbook-cream transition-colors">{label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-label-md text-scrapbook-rose mb-4">Support</p>
          <ul className="flex flex-col gap-3 text-sm">
            <li><Link href="/help" className="hover:text-scrapbook-cream transition-colors">Help Center</Link></li>
            <li><Link href="/support" className="hover:text-scrapbook-cream transition-colors">Contact Support</Link></li>
            <li><Link href="/about" className="hover:text-scrapbook-cream transition-colors">About HRUNA</Link></li>
          </ul>
        </div>
      </div>

      <div className="container-editorial py-6 border-t border-scrapbook-cream/10 text-xs text-scrapbook-cream/50">
        © 2026 HRUNA. All rights reserved.
      </div>
    </footer>
  );
}
