"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Loader2, Inbox } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { StatusBadge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { RequestStatus } from "@/types";

interface RequestSummary {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  dueDate: string;
  budgetMin: number;
  budgetMax: number;
}

const TABS: { label: string; value: "all" | RequestStatus }[] = [
  { label: "All", value: "all" },
  { label: "Submitted", value: "submitted" },
  { label: "Proposal Received", value: "proposal_received" },
  { label: "Accepted", value: "accepted" },
  { label: "Declined", value: "declined" },
];

export default function MyRequestsPage() {
  const [active, setActive] = useState<string>("all");
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [myRequests, setMyRequests] = useState<RequestSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/requests");
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Couldn't load your requests.");
        if (!cancelled) {
          setMyRequests(data.requests);
          setStatus("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load your requests.");
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = myRequests.filter((r) => active === "all" || r.status === active);

  return (
    <div className="container-editorial py-12 pb-section-gap">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-label-md text-outline mb-2">MY REQUESTS</p>
          <h1 className="text-headline-md">Your fashion requests</h1>
        </div>
        <LinkButton href="/requests/new">New Request</LinkButton>
      </div>

      {status === "loading" && (
        <div className="flex items-center justify-center gap-2 text-ink-variant py-24">
          <Loader2 className="animate-spin" size={18} /> Loading your requests…
        </div>
      )}

      {status === "error" && (
        <div className="text-center py-24">
          <p className="text-headline-sm mb-2">Couldn't load your requests</p>
          <p className="text-ink-variant text-sm">{error}</p>
        </div>
      )}

      {status === "ready" && (
        <>
          <Tabs
            tabs={TABS.map((t) => ({
              ...t,
              count: t.value === "all" ? myRequests.length : myRequests.filter((r) => r.status === t.value).length,
            }))}
            active={active}
            onChange={setActive}
          />

          {filtered.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              {filtered.map((r) => (
                <Link key={r.id} href={`/requests/${r.id}`}>
                  <Card hover>
                    <CardBody className="flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <p className="font-display text-lg">{r.title}</p>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="text-sm text-ink-variant line-clamp-2">{r.description}</p>
                      <div className="flex items-center justify-between pt-3 border-t border-outline-variant text-sm">
                        <span className="flex items-center gap-1.5 text-outline">
                          <Calendar size={14} /> Due {formatDate(r.dueDate)}
                        </span>
                        <span className="text-ink-variant">{formatCurrency(r.budgetMin)}–{formatCurrency(r.budgetMax)}</span>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <Inbox className="mx-auto text-outline mb-4" size={32} />
              <p className="text-headline-sm mb-2">No requests here yet</p>
              <p className="text-ink-variant text-sm mb-8">Start a new fashion request to hear from designers.</p>
              <LinkButton href="/requests/new">Start a Request</LinkButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}
