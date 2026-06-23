"use client";

import type { Channel } from "@/types/carousel";
import { cn } from "@/lib/utils";

interface ChannelSelectorProps {
  value: Channel;
  onChange: (channel: Channel) => void;
}

const CHANNELS: { value: Channel; label: string }[] = [
  { value: "instagram", label: "IG" },
  { value: "threads", label: "Threads" },
];

export function ChannelSelector({ value, onChange }: ChannelSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {CHANNELS.map((ch) => (
        <button
          key={ch.value}
          onClick={() => onChange(ch.value)}
          aria-pressed={value === ch.value}
          className={cn(
            "oc-press px-3 py-1.5 rounded-lg text-xs",
            value === ch.value
              ? "bg-foreground text-background"
              : "hover:bg-muted text-muted-foreground"
          )}
        >
          {ch.label}
        </button>
      ))}
    </div>
  );
}
