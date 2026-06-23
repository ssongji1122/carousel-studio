"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import type { PlanItem } from "@/types/plan";

interface FeedGridProps {
  items: PlanItem[];
}

export function FeedGrid({ items }: FeedGridProps) {
  const created = items.filter((item) => item.carouselId);

  if (created.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No carousels created yet. Click &ldquo;Create Carousels&rdquo; to fan out.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {created.map((item) => (
        <Link
          key={item.id}
          href={`/carousel/${item.carouselId}`}
          className="rounded-xl border border-border bg-surface hover:border-accent/50 hover:shadow-md hover:-translate-y-0.5 p-4 transition-[translate,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] block"
        >
          <div className="h-24 rounded-lg bg-muted mb-3 flex items-center justify-center">
            <Layers className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <p className="text-xs text-muted-foreground mb-1 truncate">{item.pillar}</p>
          <h3 className="font-semibold text-sm hover:text-accent transition-colors truncate">
            {item.topic}
          </h3>
          <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/15 text-accent">
            created
          </span>
        </Link>
      ))}
    </div>
  );
}
