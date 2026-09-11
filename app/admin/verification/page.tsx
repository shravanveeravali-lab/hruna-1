"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Suspended", value: "suspended" },
];

function statusPillClasses(status: string) {
  if (status === "approved") return "bg-emerald-500/15 text-emerald-400";
  if (status === "rejected" || status === "suspended") return "bg-red-500/15 text-red-400";
  if (status === "pending") return "bg-amber-500/15 text-amber-400";
  return "bg-white/10 text-white/60";
}

interface Row {
  verification: { designerId: string; identityStatus: string; portfolioStatus: string; overallStatus: string; submittedAt?: string };
  designer?: { id: string; name: string; avatar: string; city: string };
  roles: string[];
}

export default function AdminVerificationQueuePage() {
  const [filter, setFilter] = useState("all");
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/verification");
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Couldn't load the verification queue.");
        setRows(data.rows);
        setStatus("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load the verification queue.");
        setStatus("error");
      }
    })();
  }, []);

  const filtered = rows.filter((r) => filter === "all" || r.verification.overallStatus === filter);

  return (
    <div>
      <p className="text-white/50 text-xs tracking-wide uppercase mb-2">Verification Queue</p>
      <h1 className="text-2xl font-display mb-8">Designer applications</h1>

      {status === "loading" && (
        <div className="flex items-center justify-center gap-2 text-white/50 py-24">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      )}
      {status === "error" && (
        <div className="text-center py-24">
          <p className="text-lg font-display mb-2">Couldn't load the verification queue</p>
          <p className="text-white/50 text-sm">{error}</p>
        </div>
      )}

      {status === "ready" && (
        <>
          <div className="flex gap-2 mb-8 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border border-white/10 transition-colors",
                  filter === f.value ? "bg-white text-ink" : "text-white/60 hover:bg-white/5"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="border border-white/10 rounded-md overflow-hidden">
            {filtered.length === 0 ? (
              <p className="text-white/50 text-sm p-8 text-center">No designers match this filter.</p>
            ) : (
              filtered.map(({ verification, designer, roles }) => (
                <Link
                  key={verification.designerId}
                  href={`/admin/designers/${verification.designerId}`}
                  className="flex items-center gap-4 p-4 border-b border-white/10 last:border-none hover:bg-white/5 transition-colors"
                >
                  <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 bg-white/10">
                    {designer?.avatar && <Image src={designer.avatar} alt={designer.name} fill sizes="44px" className="object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{designer?.name ?? verification.designerId}</p>
                    <p className="text-xs text-white/50 truncate">{roles.join(" · ") || "No roles selected"} · {designer?.city || "No city set"}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-xs shrink-0">
                    <span className={cn("px-2.5 py-1 rounded-full", statusPillClasses(verification.identityStatus === "verified" ? "approved" : verification.identityStatus))}>
                      ID: {verification.identityStatus.replace(/_/g, " ")}
                    </span>
                    <span className={cn("px-2.5 py-1 rounded-full", statusPillClasses(verification.portfolioStatus === "approved" ? "approved" : verification.portfolioStatus))}>
                      Portfolio: {verification.portfolioStatus.replace(/_/g, " ")}
                    </span>
                    <span className={cn("px-2.5 py-1 rounded-full font-medium", statusPillClasses(verification.overallStatus))}>
                      {verification.overallStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="text-xs text-white/40 shrink-0 hidden md:block">
                    {verification.submittedAt ? formatDate(verification.submittedAt) : "—"}
                  </span>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
