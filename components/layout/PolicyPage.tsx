import Link from "next/link";
import { Footer } from "@/components/layout/Footer";

// Shared shell for the 9 canonical Legal & Policies documents — distinct from the simpler
// components/layout/ContentPage.tsx (still used, unmodified, by Help Center/Contact Support/About)
// because policy documents need structure ContentPage doesn't: a Last Updated date, a
// table-of-contents, anchor-linked sections, and a consistent legal-review disclaimer. One canonical
// page per policy — this component is what both Customer Settings, Designer Settings, and the
// Footer all link to; nothing here is role-specific, role-specific CONTENT lives inside individual
// sections via <RoleList> below.
export interface PolicySection {
  id: string;
  heading: string;
  body: React.ReactNode;
}

export function PolicyPage({
  eyebrow,
  title,
  lastUpdated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  intro?: React.ReactNode;
  sections: PolicySection[];
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container-editorial py-16 flex-1">
        <Link href="/" className="font-display text-2xl inline-block mb-12">
          HRUNA
        </Link>
        <div className="max-w-3xl">
          <p className="text-label-md text-outline mb-2">{eyebrow}</p>
          <h1 className="text-headline-md mb-3">{title}</h1>
          <p className="text-xs text-outline mb-8">Last updated: {lastUpdated}</p>

          <div className="p-4 rounded-md border border-outline-variant bg-surface-low text-xs text-outline mb-10">
            This document is provided for product and operational clarity. It has not yet undergone
            formal legal review and should not be relied on as legal advice — it is not a certified
            or fully compliant legal document. It will be reviewed by qualified counsel before
            production launch, and content is subject to change.
          </div>

          {intro && <div className="text-sm text-ink-variant leading-relaxed mb-10">{intro}</div>}

          {sections.length > 3 && (
            <nav aria-label="Table of contents" className="mb-12 p-5 rounded-md border border-outline-variant">
              <p className="text-label-md text-outline mb-3">ON THIS PAGE</p>
              <ol className="flex flex-col gap-2 text-sm">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="text-primary hover:underline">
                      {i + 1}. {s.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className="flex flex-col gap-10">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="text-headline-sm text-ink mb-3">{s.heading}</h2>
                <div className="text-sm text-ink-variant leading-relaxed flex flex-col gap-4">{s.body}</div>
              </section>
            ))}
          </div>

          <div className="mt-14 p-5 rounded-md border border-outline-variant bg-surface-low">
            <p className="text-sm font-medium text-ink mb-1">Questions or concerns?</p>
            <p className="text-sm text-ink-variant">
              Visit the{" "}
              <Link href="/help" className="text-primary font-medium hover:underline">
                Help Center
              </Link>{" "}
              or{" "}
              <Link href="/support" className="text-primary font-medium hover:underline">
                Contact Support
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

// Reusable role-labeled responsibility list — used by policies that split guidance across
// Customer / Designer / Platform-Wide, exactly as specified: clearly labeled, never merged.
export function RoleList({
  role,
  items,
}: {
  role: "Customer" | "Designer" | "Platform-Wide";
  items: string[];
}) {
  return (
    <div>
      <p className="text-label-md text-primary mb-2 tracking-wide">
        {role.toUpperCase()} {role === "Platform-Wide" ? "RULES" : "RESPONSIBILITIES"}
      </p>
      <ul className="list-disc pl-5 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
