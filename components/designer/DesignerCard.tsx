"use client";

import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar, Badge } from "@/components/ui/Badge";
import { SafeImage } from "@/components/ui/SafeImage";
import { RatingDisplay } from "@/components/ui/Rating";
import { SaveToggleButton } from "@/components/ui/SaveToggleButton";
import type { Designer } from "@/types";
import { formatCurrency } from "@/lib/utils";

export function DesignerCard({ designer }: { designer: Designer }) {
  return (
    <Card hover className="flex flex-col">
      <Link href={`/studio/${designer.id}`} className="group relative w-full h-44 block overflow-hidden">
        {/* SafeImage (not a bare next/image) — a designer with no banner uploaded yet must never
            crash the card; falls back to its built-in ImageOff placeholder instead. */}
        <SafeImage
          src={designer.banner}
          alt={designer.studioName}
          sizes="(max-width: 768px) 100vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {!designer.available && (
          <span className="absolute top-3 right-3">
            <Badge tone="neutral">Fully Booked</Badge>
          </span>
        )}
        <div className="absolute top-3 left-3">
          <SaveToggleButton itemType="designer" itemId={designer.id} size="sm" />
        </div>
      </Link>
      <CardBody className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={designer.avatar} alt={designer.name} size={44} verified={designer.verified} />
          <div className="min-w-0">
            <p className="font-display text-lg leading-tight truncate">{designer.studioName}</p>
            <p className="text-xs text-outline">{designer.type} · {designer.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {designer.specializations.slice(0, 2).map((s) => (
            <Badge key={s} tone="primary">{s}</Badge>
          ))}
        </div>
        <p className="text-sm text-ink-variant line-clamp-2">{designer.bio}</p>
        <div className="flex items-center justify-between pt-2 border-t border-outline-variant text-sm">
          <div className="flex items-center gap-1 text-outline">
            <MapPin size={14} />
            <span>{designer.city}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <RatingDisplay value={designer.rating} />
            <span className="text-outline text-xs">({designer.reviewCount})</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-outline">From {formatCurrency(designer.startingPrice)}</span>
          <Link href={`/studio/${designer.id}`} className="group inline-flex items-center gap-1 text-sm font-medium text-primary">
            View Studio
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
