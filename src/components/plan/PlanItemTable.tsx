"use client";

import { Plus, Trash2 } from "lucide-react";
import type { PlanItem } from "@/types/plan";

interface PlanItemTableProps {
  items: PlanItem[];
  onChange: (items: PlanItem[]) => void;
}

export function PlanItemTable({ items, onChange }: PlanItemTableProps) {
  const nextId = () =>
    items.reduce((m, i) => Math.max(m, i.id), 0) + 1;

  const handlePillarChange = (id: number, value: string) => {
    onChange(items.map((item) => (item.id === id ? { ...item, pillar: value } : item)));
  };

  const handleTopicChange = (id: number, value: string) => {
    onChange(items.map((item) => (item.id === id ? { ...item, topic: value } : item)));
  };

  const handleDelete = (id: number) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const handleAdd = () => {
    const newItem: PlanItem = {
      id: nextId(),
      pillar: "",
      topic: "",
      status: "planned",
      carouselId: null,
    };
    onChange([...items, newItem]);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-8">#</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-40">Pillar</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Topic</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-20">Status</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
              <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
              <td className="px-3 py-1.5">
                <input
                  type="text"
                  value={item.pillar}
                  onChange={(e) => handlePillarChange(item.id, e.target.value)}
                  placeholder="Pillar"
                  className="w-full bg-transparent border border-transparent hover:border-border focus:border-accent rounded-md px-2 py-1 outline-none text-sm transition-colors"
                />
              </td>
              <td className="px-3 py-1.5">
                <input
                  type="text"
                  value={item.topic}
                  onChange={(e) => handleTopicChange(item.id, e.target.value)}
                  placeholder="Topic"
                  className="w-full bg-transparent border border-transparent hover:border-border focus:border-accent rounded-md px-2 py-1 outline-none text-sm transition-colors"
                />
              </td>
              <td className="px-4 py-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.status === "created"
                      ? "bg-accent/15 text-accent"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.status === "created" ? "created" : "planned"}
                </span>
              </td>
              <td className="px-2 py-1.5">
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={item.status === "created"}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  aria-label="Delete row"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="px-4 py-2 border-t border-border bg-muted/20">
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add row
        </button>
      </div>
    </div>
  );
}
