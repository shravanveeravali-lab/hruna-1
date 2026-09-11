"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, MessageCircle, Menu, X } from "lucide-react";
import { Avatar, Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/designer/home", label: "Home" },
  { href: "/designer/discover-requests", label: "Discover" },
  { href: "/designer/requests", label: "Requests" },
  { href: "/designer/projects", label: "Projects" },
  { href: "/designer/studio", label: "My Studio" },
];

// name/avatar are the signed-in designer's real identity (Phase 7 fix — this used to always show
// the seeded mock designer), resolved server-side by app/(designer)/layout.tsx and passed down.
export function DesignerNavbar({ name, avatar }: { name: string; avatar: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const displayName = name || "Your Profile";
  const avatarUrl = avatar;

  return (
    <header className="sticky top-0 z-40 bg-surface/85 backdrop-blur-md border-b border-primary/10">
      <div className="container-editorial flex items-center justify-between h-20">
        <div className="flex items-center gap-10">
          <Link href="/designer/home" className="font-display text-2xl tracking-wide text-ink flex items-center gap-2">
            LILIRVE <Badge tone="primary" className="text-[10px]">STUDIO</Badge>
          </Link>
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm transition-colors",
                  pathname?.startsWith(link.href) ? "text-ink font-medium" : "text-ink-variant hover:text-ink"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link href="/designer/notifications" aria-label="Notifications" className="p-2.5 rounded-full hover:bg-ink/5 text-ink-variant transition-colors">
            <Bell size={19} />
          </Link>
          <Link href="/designer/messages" aria-label="Messages" className="p-2.5 rounded-full hover:bg-ink/5 text-ink-variant transition-colors">
            <MessageCircle size={19} />
          </Link>
          <Link href="/designer/profile" className="ml-2" aria-label="Profile">
            <Avatar src={avatarUrl} alt={displayName} size={38} />
          </Link>
        </div>

        <button className="lg:hidden p-2 text-ink-variant" aria-label="Open menu" onClick={() => setOpen(true)}>
          <Menu size={22} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-surface flex flex-col lg:hidden animate-[fadeIn_0.15s_ease]">
          <div className="flex items-center justify-between h-20 container-editorial">
            <span className="font-display text-2xl">LILIRVE</span>
            <button aria-label="Close menu" onClick={() => setOpen(false)} className="p-2 text-ink-variant">
              <X size={22} />
            </button>
          </div>
          <nav className="flex flex-col gap-1 px-6 pt-4">
            {[
              ...navLinks,
              { href: "/designer/reviews", label: "Reviews" },
              { href: "/designer/messages", label: "Messages" },
              { href: "/designer/profile", label: "Profile & Settings" },
            ].map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="py-4 text-headline-sm border-b border-outline-variant">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
