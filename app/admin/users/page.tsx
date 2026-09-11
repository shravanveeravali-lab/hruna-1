"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Ban, CheckCircle2, Search, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/hooks/use-toast";
import { formatDate, cn } from "@/lib/utils";

const DESIGNER_STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Approved", value: "approved" },
  { label: "Pending", value: "pending" },
  { label: "Rejected", value: "rejected" },
  { label: "Suspended", value: "suspended" },
];

function statusPillClasses(status: string) {
  if (status === "approved") return "bg-emerald-500/15 text-emerald-400";
  if (status === "rejected" || status === "suspended") return "bg-red-500/15 text-red-400";
  if (status === "pending") return "bg-amber-500/15 text-amber-400";
  return "bg-white/10 text-white/60";
}

interface CustomerRow { id: string; name: string; city: string; phone: string; status: string; createdAt: string; hasActiveSubscription: boolean }
interface DesignerRow { id: string; name: string; studioName: string; city: string; rating: number; overallStatus: string; createdAt: string; hasActiveSubscription: boolean }

export default function AdminUsersPage() {
  const { push } = useToast();
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [designers, setDesigners] = useState<DesignerRow[]>([]);
  const [designerFilter, setDesignerFilter] = useState("all");
  const [designerSearch, setDesignerSearch] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<{ type: "customer" | "designer"; id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Couldn't load users.");
      setCustomers(data.customers);
      setDesigners(data.designers);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load users.");
      setStatus("error");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const confirmSuspend = async () => {
    if (!suspendTarget) return;
    setBusy(true);
    try {
      const path = suspendTarget.type === "customer" ? `/api/admin/customers/${suspendTarget.id}/suspend` : `/api/admin/designers/${suspendTarget.id}/suspend`;
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Suspended by admin from Users list." }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Couldn't suspend this account.");
      push(suspendTarget.type === "customer" ? "Customer suspended." : "Designer suspended.", "info");
      setSuspendTarget(null);
      await load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Couldn't suspend this account.", "error");
    } finally {
      setBusy(false);
    }
  };

  const reactivateCustomer = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/customers/${id}/reactivate`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Couldn't reactivate this account.");
      }
      push("Customer reactivated.");
      await load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Couldn't reactivate this account.", "error");
    }
  };

  const reinstateDesigner = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/designers/${id}/approve-profile`, { method: "POST" });
      const data = await res.json();
      push(res.ok ? "Designer reinstated." : (data.message ?? "Cannot reinstate — identity/portfolio must be verified/approved first."), res.ok ? "success" : "error");
      if (res.ok) await load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Couldn't reinstate this designer.", "error");
    }
  };

  const designerRows = useMemo(() => {
    return designers
      .filter((d) => designerFilter === "all" || d.overallStatus === designerFilter)
      .filter((d) => {
        const q = designerSearch.trim().toLowerCase();
        if (!q) return true;
        return d.name.toLowerCase().includes(q) || d.studioName.toLowerCase().includes(q) || d.city.toLowerCase().includes(q);
      });
  }, [designers, designerFilter, designerSearch]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 text-white/50 py-24">
        <Loader2 className="animate-spin" size={18} /> Loading users…
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="text-center py-24">
        <p className="text-lg font-display mb-2">Couldn't load users</p>
        <p className="text-white/50 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-white/50 text-xs tracking-wide uppercase mb-2">User Management</p>
      <h1 className="text-2xl font-display mb-8">All users</h1>

      {/* CUSTOMERS */}
      <section className="mb-12">
        <p className="text-sm text-white/50 mb-4">Customers ({customers.length})</p>
        {customers.length === 0 ? (
          <p className="text-white/50 text-sm border border-white/10 rounded-md p-8 text-center">No customers registered yet.</p>
        ) : (
          <div className="border border-white/10 rounded-md overflow-hidden">
            {customers.map((customer) => (
              <div key={customer.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border-b border-white/10 last:border-none">
                <div className="flex-1 min-w-0">
                  <Link href={`/admin/customers/${customer.id}`} className="text-sm font-medium hover:underline">{customer.name}</Link>
                  <p className="text-xs text-white/50 truncate">{customer.phone || "No phone set"} · {customer.city || "No city set"}</p>
                  <p className="text-xs text-white/30 mt-0.5">Joined {formatDate(customer.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <StatusBadge status={customer.hasActiveSubscription ? "active" : "none"} />
                  <StatusBadge status={customer.status} />
                  <Link href={`/admin/customers/${customer.id}`} className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/70 hover:bg-white/5 transition-colors">
                    View
                  </Link>
                  {customer.status === "suspended" ? (
                    <button
                      onClick={() => reactivateCustomer(customer.id)}
                      className="text-xs px-3 py-1.5 rounded-full border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 size={12} /> Reactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => setSuspendTarget({ type: "customer", id: customer.id, name: customer.name })}
                      className="text-xs px-3 py-1.5 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1"
                    >
                      <Ban size={12} /> Suspend
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* DESIGNERS */}
      <section>
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <p className="text-sm text-white/50">Designers ({designerRows.length}/{designers.length})</p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
              <input
                value={designerSearch}
                onChange={(e) => setDesignerSearch(e.target.value)}
                placeholder="Search name, studio, city"
                className="bg-white/5 border border-white/10 rounded-full pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 w-56"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {DESIGNER_STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setDesignerFilter(f.value)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border border-white/10 transition-colors",
                    designerFilter === f.value ? "bg-white text-ink" : "text-white/60 hover:bg-white/5"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="border border-white/10 rounded-md overflow-hidden">
          {designerRows.length === 0 ? (
            <p className="text-white/50 text-sm p-8 text-center">No designers match this search/filter.</p>
          ) : (
            designerRows.map((designer) => (
              <div key={designer.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border-b border-white/10 last:border-none">
                <div className="flex-1 min-w-0">
                  <Link href={`/admin/designers/${designer.id}`} className="text-sm font-medium hover:underline">{designer.name}</Link>
                  <p className="text-xs text-white/50 truncate">{designer.studioName || "No studio name set"} · {designer.city || "No city set"}</p>
                  <p className="text-xs text-white/30 mt-0.5">Joined {formatDate(designer.createdAt)} · ★ {designer.rating || "—"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <StatusBadge status={designer.hasActiveSubscription ? "active" : "none"} />
                  <span className={cn("text-xs px-2.5 py-1 rounded-full", statusPillClasses(designer.overallStatus))}>{designer.overallStatus.replace(/_/g, " ")}</span>
                  <Link href={`/admin/designers/${designer.id}`} className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/70 hover:bg-white/5 transition-colors">
                    View
                  </Link>
                  {designer.overallStatus === "suspended" ? (
                    <button
                      onClick={() => reinstateDesigner(designer.id)}
                      className="text-xs px-3 py-1.5 rounded-full border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 size={12} /> Reinstate
                    </button>
                  ) : (
                    <button
                      onClick={() => setSuspendTarget({ type: "designer", id: designer.id, name: designer.name })}
                      className="text-xs px-3 py-1.5 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1"
                    >
                      <Ban size={12} /> Suspend
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <Modal open={!!suspendTarget} onClose={() => setSuspendTarget(null)} title="Suspend account">
        <div className="flex flex-col gap-5">
          <p className="text-sm text-ink-variant">
            Are you sure you want to suspend <strong>{suspendTarget?.name}</strong>'s account? They will be flagged as suspended until reactivated.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setSuspendTarget(null)} disabled={busy}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={confirmSuspend} disabled={busy}>{busy ? "Suspending…" : "Suspend"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
