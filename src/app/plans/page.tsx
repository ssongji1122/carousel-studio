"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { ChannelSelector } from "@/components/editor/ChannelSelector";
import type { Channel } from "@/types/carousel";

export default function PlansPage() {
  const router = useRouter();
  const [scope, setScope] = useState("");
  const [target, setTarget] = useState("");
  const [channel, setChannel] = useState<Channel>("instagram");
  const [count, setCount] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!scope.trim() || !target.trim()) {
      setError("Scope and target are required.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: scope.trim(), target: target.trim(), channel, count }),
      });
      if (!res.ok) {
        const data: { error?: string } = await res.json();
        setError(data.error ?? "Failed to create plan.");
        return;
      }
      const plan: { id: string } = await res.json();
      router.push(`/plans/${plan.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <TopBar title="Series Planner" showBack />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-bold mb-1">New Series Plan</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Describe your content series. AI will generate topic ideas for each carousel.
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="scope">
                Scope
              </label>
              <textarea
                id="scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="e.g. Practical AI tools for indie designers"
                rows={3}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="target">
                Target Audience
              </label>
              <input
                id="target"
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g. Freelance designers aged 25-35"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent transition-colors"
              />
            </div>

            <div className="flex items-center gap-6">
              <div>
                <label className="block text-sm font-medium mb-1.5">Channel</label>
                <ChannelSelector value={channel} onChange={setChannel} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="count">
                  Number of topics
                </label>
                <input
                  id="count"
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className="w-20 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              variant="accent"
              size="lg"
              onClick={handleCreate}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Creating..." : "Create Plan"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
