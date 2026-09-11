"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Heart, Eye, Bookmark, MapPin, Calendar, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 110;

interface FeedRequest {
  id: string;
  title: string;
  category: string;
  occasion: string;
  location: string;
  dueDate: string;
  budgetMin: number;
  budgetMax: number;
  description: string;
  inspirationImages: string[];
}

// The Discover Requests swipe feed (§5 — explicitly critical) — real fashion_requests, gated
// server-side by requireApprovedDesigner() (app/api/designer/feed/route.ts), never a client-side
// "SELECT * FROM fashion_requests". A pending/rejected/suspended designer gets a clear message
// here instead of a silently empty feed, matching §43's "enforce server-side" requirement.
export default function DiscoverRequestsPage() {
  const router = useRouter();
  const { push } = useToast();

  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [feed, setFeed] = useState<FeedRequest[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/designer/feed");
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Couldn't load the request feed.");
        setFeed(data.requests);
        setStatus("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load the request feed.");
        setStatus("error");
      }
    })();
  }, []);

  const removeFromFeed = (id: string) => setFeed((f) => f.filter((r) => r.id !== id));

  // Returns whether the call succeeded — handleInterested/handlePass use this to put a swiped
  // card back in the feed if the backend never actually recorded the interaction, instead of
  // leaving it silently gone (a toast alone doesn't undo an optimistic removal).
  const interact = async (request: FeedRequest, body: { swipeStatus?: string; saved?: boolean }) => {
    try {
      const res = await fetch(`/api/designer/requests/${request.id}/interaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Something went wrong.");
      }
      return true;
    } catch (err) {
      push(err instanceof Error ? err.message : "Something went wrong.", "error");
      return false;
    }
  };

  const restoreToFeed = (request: FeedRequest) => {
    setFeed((f) => (f.some((r) => r.id === request.id) ? f : [request, ...f]));
  };

  const handleInterested = (request: FeedRequest) => {
    removeFromFeed(request.id);
    push("Added to Interested Designs.", "success");
    void interact(request, { swipeStatus: "interested" }).then((ok) => {
      if (!ok) restoreToFeed(request);
    });
  };

  const handlePass = (request: FeedRequest) => {
    removeFromFeed(request.id);
    push("Disliked.", "info");
    void interact(request, { swipeStatus: "declined" }).then((ok) => {
      if (!ok) restoreToFeed(request);
    });
  };

  const handleSave = (request: FeedRequest) => {
    push("Saved.", "success");
    void interact(request, { saved: true });
  };

  if (status === "loading") {
    return (
      <div className="container-editorial py-12 pb-section-gap">
        <div className="flex items-center justify-center gap-2 text-ink-variant py-24">
          <Loader2 className="animate-spin" size={18} /> Loading requests…
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="container-editorial py-12 pb-section-gap text-center">
        <p className="text-headline-sm mb-2">Couldn't load the request feed</p>
        <p className="text-ink-variant text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="container-editorial py-12 pb-section-gap">
      <p className="text-label-md text-outline mb-2">DISCOVER REQUESTS</p>
      <h1 className="text-headline-md mb-10">Public requests looking for a designer</h1>

      <SwipeFeed
        feed={feed}
        onInterested={handleInterested}
        onPass={handlePass}
        onSave={handleSave}
        onView={(id) => router.push(`/designer/requests/${id}`)}
      />
    </div>
  );
}

function SwipeFeed({
  feed,
  onInterested,
  onPass,
  onSave,
  onView,
}: {
  feed: FeedRequest[];
  onInterested: (r: FeedRequest) => void;
  onPass: (r: FeedRequest) => void;
  onSave: (r: FeedRequest) => void;
  onView: (id: string) => void;
}) {
  if (feed.length === 0) {
    return (
      <div className="rounded-md border border-outline-variant bg-surface-low py-20 text-center max-w-md mx-auto">
        <p className="text-headline-sm mb-2">You're all caught up</p>
        <p className="text-ink-variant text-sm">New public fashion requests will appear here for you to discover.</p>
      </div>
    );
  }

  const visible = feed.slice(0, 3);

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-full max-w-sm mx-auto"
        style={{ height: "min(560px, calc(100vh - 260px))", minHeight: 480 }}
      >
        {visible
          .map((request, i) => (
            <SwipeCard
              key={request.id}
              request={request}
              stackIndex={i}
              isTop={i === 0}
              onInterested={() => onInterested(request)}
              onPass={() => onPass(request)}
              onSave={() => onSave(request)}
              onView={() => onView(request.id)}
            />
          ))
          .reverse()}
      </div>
      <p className="text-xs text-outline mt-6">Swipe or use the buttons below to respond</p>
    </div>
  );
}

function SwipeCard({
  request,
  stackIndex,
  isTop,
  onInterested,
  onPass,
  onSave,
  onView,
}: {
  request: FeedRequest;
  stackIndex: number;
  isTop: boolean;
  onInterested: () => void;
  onPass: () => void;
  onSave: () => void;
  onView: () => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const startX = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isTop) return;
    setDragging(true);
    startX.current = e.clientX;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !isTop) return;
    setDragX(e.clientX - startX.current);
  };

  const finishDrag = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) triggerExit("right");
    else if (dragX < -SWIPE_THRESHOLD) triggerExit("left");
    else setDragX(0);
  };

  const triggerExit = (direction: "left" | "right") => {
    setExiting(direction);
    setTimeout(() => (direction === "right" ? onInterested() : onPass()), 180);
  };

  const handleSaveClick = () => {
    onSave();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1200);
  };

  const rotation = (isTop ? dragX : 0) / 14;
  const translateX = exiting ? (exiting === "right" ? 600 : -600) : isTop ? dragX : 0;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      className="absolute inset-0 select-none touch-none"
      style={{
        transform: `translate(${translateX}px, ${stackIndex * 10}px) rotate(${rotation}deg) scale(${1 - stackIndex * 0.04})`,
        transition: dragging ? "none" : "transform 0.3s ease",
        zIndex: 10 - stackIndex,
        opacity: exiting ? 0 : 1 - stackIndex * 0.15,
        cursor: isTop ? (dragging ? "grabbing" : "grab") : "default",
      }}
    >
      <div className="w-full h-full bg-surface-lowest border border-primary/10 rounded-md shadow-soft overflow-hidden flex flex-col">
        <div className="relative h-36 shrink-0">
          {request.inspirationImages[0] ? (
            <Image src={request.inspirationImages[0]} alt={request.title} fill sizes="384px" className="object-cover pointer-events-none" />
          ) : (
            <div className="w-full h-full bg-surface-container" />
          )}
          {isTop && dragX > 40 && (
            <span className="absolute top-3 left-3 border-2 border-emerald-500 text-emerald-600 text-xs font-bold px-3 py-1 rounded rotate-[-8deg] bg-white/90">INTERESTED</span>
          )}
          {isTop && dragX < -40 && (
            <span className="absolute top-3 right-3 border-2 border-error text-error text-xs font-bold px-3 py-1 rounded rotate-[8deg] bg-white/90">PASS</span>
          )}
        </div>
        <div className="p-4 flex-1 flex flex-col gap-1.5 min-h-0 overflow-hidden">
          <p className="font-display text-lg leading-tight truncate">{request.title}</p>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="bg-primary-container text-primary-on-container rounded-full px-2.5 py-0.5">{request.category}</span>
            <span className="bg-surface-container text-ink-variant rounded-full px-2.5 py-0.5">{request.occasion}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-outline">
            <MapPin size={12} /> {request.location}
            <span className="mx-1">·</span>
            <Calendar size={12} /> Due {formatDate(request.dueDate)}
          </div>
          <p className="text-primary text-sm font-medium">{formatCurrency(request.budgetMin)} – {formatCurrency(request.budgetMax)}</p>
          <p className="text-xs text-ink-variant line-clamp-2">{request.description}</p>
        </div>
        <div className="flex items-center justify-between gap-2 p-3 border-t border-outline-variant shrink-0">
          <button
            onClick={() => triggerExit("left")}
            aria-label="Dislike"
            className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-outline hover:border-error hover:text-error transition-colors shrink-0"
          >
            <X size={18} />
          </button>
          <button
            onClick={onView}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-ink-variant border border-outline-variant rounded-full py-2 hover:border-primary hover:text-primary transition-colors"
          >
            <Eye size={14} /> View
          </button>
          <button
            onClick={handleSaveClick}
            aria-label="Save"
            className={cn(
              "w-10 h-10 rounded-full border flex items-center justify-center transition-colors shrink-0",
              justSaved ? "border-primary text-primary" : "border-outline-variant text-outline hover:border-primary hover:text-primary"
            )}
          >
            <Bookmark size={17} className={justSaved ? "fill-primary" : ""} />
          </button>
          <button
            onClick={() => triggerExit("right")}
            aria-label="Like"
            className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-outline hover:border-emerald-500 hover:text-emerald-600 transition-colors shrink-0"
          >
            <Heart size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
