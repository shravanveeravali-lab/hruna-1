"use client";

import { useEffect, useState } from "react";
import { MessageSquareWarning, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Textarea } from "@/components/ui/Input";
import { useToast } from "@/hooks/use-toast";
import { formatDate, cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Under Review", value: "under_review" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

const NEXT_STEP_LABEL: Record<string, string> = {
  open: "Mark Under Review",
  under_review: "Mark Resolved",
  resolved: "Close Dispute",
};

interface DisputeRow {
  id: string; issue: string; status: string; createdAt: string; updatedAt: string; details: string;
  projectId?: string; customer?: { name: string }; designer?: { name: string };
}
interface Note { id: string; text: string; adminName: string; timestamp: string }

export default function AdminDisputesPage() {
  const { push } = useToast();
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ dispute: DisputeRow & { projectTitle?: string }; notes: Note[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/disputes");
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Couldn't load disputes.");
        setDisputes(data.disputes);
        setStatus("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load disputes.");
        setStatus("error");
      }
    })();
  }, []);

  const openDispute = async (id: string) => {
    setActiveId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/disputes/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Couldn't load this dispute.");
      setDetail(data);
    } catch (err) {
      push(err instanceof Error ? err.message : "Couldn't load this dispute.", "error");
      setActiveId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setActiveId(null);
    setDetail(null);
    setNote("");
  };

  const advance = async () => {
    if (!activeId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/disputes/${activeId}/status`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Couldn't update this dispute.");
      push(`Dispute marked ${data.newStatus.replace(/_/g, " ")}.`);
      setDisputes((prev) => prev.map((d) => (d.id === activeId ? { ...d, status: data.newStatus } : d)));
      setDetail((prev) => (prev ? { ...prev, dispute: { ...prev.dispute, status: data.newStatus } } : prev));
    } catch (err) {
      push(err instanceof Error ? err.message : "Couldn't update this dispute.", "error");
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    if (!activeId || !note.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/disputes/${activeId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: note.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Couldn't add this note.");
      setDetail((prev) => (prev ? { ...prev, notes: [...prev.notes, data.note] } : prev));
      setNote("");
      push("Note added.");
    } catch (err) {
      push(err instanceof Error ? err.message : "Couldn't add this note.", "error");
    } finally {
      setBusy(false);
    }
  };

  const rows = disputes.filter((d) => filter === "all" || d.status === filter);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 text-white/50 py-24">
        <Loader2 className="animate-spin" size={18} /> Loading disputes…
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="text-center py-24">
        <p className="text-lg font-display mb-2">Couldn't load disputes</p>
        <p className="text-white/50 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-white/50 text-xs tracking-wide uppercase mb-2">Reports & Disputes</p>
      <h1 className="text-2xl font-display mb-8">Customer/designer disputes</h1>

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
        {rows.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquareWarning className="mx-auto text-white/20 mb-3" size={26} />
            <p className="text-white/50 text-sm">No disputes match this filter.</p>
          </div>
        ) : (
          rows.map((d) => (
            <button
              key={d.id}
              onClick={() => openDispute(d.id)}
              className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 border-b border-white/10 last:border-none hover:bg-white/5 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.issue}</p>
                <p className="text-xs text-white/40 truncate">{d.customer?.name ?? d.id} · {d.designer?.name ?? ""}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={d.status} />
                <span className="text-xs text-white/30 w-20 text-right">{formatDate(d.createdAt)}</span>
              </div>
            </button>
          ))
        )}
      </div>

      <Modal open={!!activeId} onClose={closeModal} title="Dispute details">
        {detailLoading && (
          <div className="flex items-center justify-center gap-2 text-ink-variant py-12">
            <Loader2 className="animate-spin" size={16} /> Loading…
          </div>
        )}
        {detail && !detailLoading && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-ink">{detail.dispute.issue}</p>
              <StatusBadge status={detail.dispute.status} />
            </div>
            <p className="text-sm text-ink-variant leading-relaxed">{detail.dispute.details}</p>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-outline uppercase mb-1">Customer</p>
                <p className="text-ink">{detail.dispute.customer?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-outline uppercase mb-1">Designer</p>
                <p className="text-ink">{detail.dispute.designer?.name ?? "—"}</p>
              </div>
              {detail.dispute.projectTitle && (
                <div className="col-span-2">
                  <p className="text-outline uppercase mb-1">Related project</p>
                  <p className="text-ink">{detail.dispute.projectTitle}</p>
                </div>
              )}
              <div>
                <p className="text-outline uppercase mb-1">Opened</p>
                <p className="text-ink">{formatDate(detail.dispute.createdAt)}</p>
              </div>
              <div>
                <p className="text-outline uppercase mb-1">Last updated</p>
                <p className="text-ink">{formatDate(detail.dispute.updatedAt)}</p>
              </div>
            </div>

            <div>
              <p className="text-label-md text-outline mb-2">ADMIN NOTES</p>
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto mb-3">
                {detail.notes.length === 0 ? (
                  <p className="text-xs text-outline">No notes yet.</p>
                ) : (
                  detail.notes.map((n) => (
                    <div key={n.id} className="text-xs bg-surface-low rounded p-3">
                      <p className="text-ink">{n.text}</p>
                      <p className="text-outline mt-1">{n.adminName} · {formatDate(n.timestamp)}</p>
                    </div>
                  ))
                )}
              </div>
              <Field label="Add a note" htmlFor="disputeNote">
                <Textarea id="disputeNote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you find / do next?" />
              </Field>
              <Button size="sm" variant="secondary" className="mt-2" onClick={saveNote} disabled={!note.trim() || busy}>
                Add Note
              </Button>
            </div>

            <div className="flex gap-3 pt-2 border-t border-outline-variant">
              {NEXT_STEP_LABEL[detail.dispute.status] ? (
                <Button className="flex-1" onClick={advance} disabled={busy}>{NEXT_STEP_LABEL[detail.dispute.status]}</Button>
              ) : (
                <p className="text-xs text-outline">This dispute is closed — no further action needed.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
