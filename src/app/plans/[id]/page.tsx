"use client";

import { use, useCallback, useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { PlanItemTable } from "@/components/plan/PlanItemTable";
import { FeedGrid } from "@/components/plan/FeedGrid";
import type { Plan, PlanItem } from "@/types/plan";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PlanDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [fanning, setFanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localItems, setLocalItems] = useState<PlanItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) {
        const data: Plan = await res.json();
        setPlan(data);
        setLocalItems(data.items);
        setDirty(false);
      }
    } catch {
      // ignore network errors
    }
  }, [id]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const handleItemsChange = (items: PlanItem[]) => {
    setLocalItems(items);
    setDirty(true);
  };

  const handleSaveItems = async (): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: localItems }),
      });
      if (res.ok) {
        const updated: Plan = await res.json();
        setPlan(updated);
        setLocalItems(updated.items);
        setDirty(false);
        return true;
      }
      setError("Failed to save changes.");
      return false;
    } catch {
      setError("Network error.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/plans/${id}/generate`, { method: "POST" });
      if (res.ok) {
        const updated: Plan = await res.json();
        setPlan(updated);
        setLocalItems(updated.items);
        setDirty(false);
      } else {
        setError("Topic generation failed. Claude CLI may be unavailable.");
      }
    } catch {
      setError("Network error during generation.");
    } finally {
      setGenerating(false);
    }
  };

  const handleFanout = async () => {
    // Save pending edits first; abort if the save fails so fan-out never
    // operates on a stale server-side plan (silently dropping the edits).
    if (dirty) {
      const ok = await handleSaveItems();
      if (!ok) {
        setError("저장에 실패해 캐로셀 생성을 멈췄습니다.");
        return;
      }
    }
    setFanning(true);
    setError(null);
    try {
      const res = await fetch(`/api/plans/${id}/fanout`, { method: "POST" });
      if (res.ok) {
        const updated: Plan = await res.json();
        setPlan(updated);
        setLocalItems(updated.items);
        setDirty(false);
      } else {
        setError("Fan-out failed.");
      }
    } catch {
      setError("Network error during fan-out.");
    } finally {
      setFanning(false);
    }
  };

  if (notFound) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold">Plan not found</p>
        <a href="/plans" className="text-sm text-accent underline">
          Back to plans
        </a>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasFanout = localItems.some((item) => item.carouselId);

  return (
    <div className="h-full flex flex-col">
      <TopBar title="Series Plan" showBack />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
          {/* Brief summary */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <h1 className="text-lg font-semibold">Plan brief</h1>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Scope</p>
                <p>{plan.brief.scope}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Target</p>
                <p>{plan.brief.target}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Channel: <span className="text-foreground capitalize">{plan.channel}</span></span>
              <span className="text-muted-foreground">Count: <span className="text-foreground">{plan.count}</span></span>
            </div>
          </div>

          {/* Topic table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Topics ({localItems.length})</h2>
              <div className="flex items-center gap-2">
                {dirty && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveItems}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generating || fanning}
                >
                  {generating ? "Generating..." : "Generate topics"}
                </Button>
              </div>
            </div>

            {localItems.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/20 py-10 text-center text-sm text-muted-foreground">
                No topics yet. Click &ldquo;Generate topics&rdquo; or add rows manually.
              </div>
            ) : (
              <PlanItemTable items={localItems} onChange={handleItemsChange} />
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Fan-out button */}
          {localItems.length > 0 && (
            <div className="pt-2">
              <Button
                variant="accent"
                size="lg"
                onClick={handleFanout}
                disabled={fanning || generating}
                className="w-full"
              >
                {fanning ? "Creating carousels..." : "Create Carousels"}
              </Button>
            </div>
          )}

          {/* Feed grid */}
          {hasFanout && (
            <div>
              <h2 className="font-semibold mb-4">Carousel Feed</h2>
              <FeedGrid items={localItems} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
