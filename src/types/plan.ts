import type { Channel } from "@/types/carousel";

export type PlanItemStatus = "planned" | "created";

export interface PlanItem {
  id: number;
  pillar: string;
  topic: string;
  status: PlanItemStatus;
  carouselId: string | null;
}

export interface Plan {
  id: string;
  projectId: string;
  brandId?: string;
  brief: { scope: string; target: string };
  channel: Channel;
  count: number;
  pillars: string[];
  items: PlanItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PlansData {
  plans: Plan[];
}
