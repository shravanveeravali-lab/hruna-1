"use client";

import { useEffect, useState } from "react";
import { Send, Users, User, Briefcase, Loader2 } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/use-toast";
import { formatDate, cn } from "@/lib/utils";

type Audience = "all" | "customer" | "designer";
const AUDIENCES: { value: Audience; label: string; icon: any }[] = [
  { value: "all", label: "All users", icon: Users },
  { value: "customer", label: "Customers", icon: User },
  { value: "designer", label: "Designers", icon: Briefcase },
];

interface Notification { id: string; title: string; message: string; audience: Audience; createdAt: string; createdBy: string }

export default function AdminNotificationsPage() {
  const { push } = useToast();
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/notifications");
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Couldn't load notifications.");
        setNotifications(data.notifications);
        setStatus("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load notifications.");
        setStatus("error");
      }
    })();
  }, []);

  const canSend = title.trim().length > 0 && message.trim().length > 0;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), audience }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Couldn't publish this notification.");
      setNotifications((prev) => [data.notification, ...prev]);
      push("Notification published.");
      setTitle("");
      setMessage("");
      setAudience("all");
    } catch (err) {
      push(err instanceof Error ? err.message : "Couldn't publish this notification.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <p className="text-white/50 text-xs tracking-wide uppercase mb-2">System Notifications</p>
      <h1 className="text-2xl font-display mb-8">Platform announcements</h1>

      <section className="border border-white/10 rounded-md p-6 mb-10 max-w-xl">
        <p className="text-sm font-medium mb-5">Create notification</p>
        <div className="flex flex-col gap-4">
          <Field label="Title" htmlFor="annTitle" required>
            <Input id="annTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Scheduled maintenance tonight" />
          </Field>
          <Field label="Message" htmlFor="annMessage" required>
            <Textarea id="annMessage" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What should the audience know?" />
          </Field>
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wide mb-2">Audience</p>
            <div className="flex gap-2 flex-wrap">
              {AUDIENCES.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setAudience(a.value)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-3 py-2 rounded-full border transition-colors",
                    audience === a.value ? "bg-white text-ink border-white" : "border-white/10 text-white/60 hover:bg-white/5"
                  )}
                >
                  <a.icon size={13} /> {a.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleSend} disabled={!canSend || sending} className="w-fit">
            <Send size={14} /> {sending ? "Sending…" : "Send Notification"}
          </Button>
        </div>
      </section>

      <section>
        <p className="text-sm text-white/50 mb-4">History ({notifications.length})</p>
        {status === "loading" ? (
          <div className="flex items-center justify-center gap-2 text-white/50 py-16">
            <Loader2 className="animate-spin" size={18} /> Loading…
          </div>
        ) : status === "error" ? (
          <p className="text-white/50 text-sm border border-white/10 rounded-md p-8 text-center">{error}</p>
        ) : (
          <div className="border border-white/10 rounded-md overflow-hidden">
            {notifications.length === 0 ? (
              <p className="text-white/50 text-sm p-8 text-center">No notifications sent yet.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-4 border-b border-white/10 last:border-none">
                  <div className="flex items-start justify-between gap-4 mb-1.5">
                    <p className="text-sm font-medium">{n.title}</p>
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 text-white/60 shrink-0 capitalize">
                      {n.audience === "all" ? "All users" : `${n.audience}s`}
                    </span>
                  </div>
                  <p className="text-sm text-white/60 mb-2">{n.message}</p>
                  <p className="text-xs text-white/30">{n.createdBy} · {formatDate(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
