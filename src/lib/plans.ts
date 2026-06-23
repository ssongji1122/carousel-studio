import type { Channel } from "@/types/carousel";
import type { Plan, PlanItem, PlansData } from "@/types/plan";
import { readDataSafe, writeData } from "@/lib/data";

const FILE = "plans.json";
const now = () => new Date().toISOString();
const generateId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

async function load(): Promise<PlansData> {
  return readDataSafe<PlansData>(FILE, { plans: [] });
}
async function save(data: PlansData): Promise<void> {
  await writeData(FILE, data);
}

export async function listPlans(): Promise<Plan[]> {
  return (await load()).plans;
}

export async function getPlan(id: string): Promise<Plan | null> {
  return (await load()).plans.find((p) => p.id === id) ?? null;
}

export async function createPlan(
  brief: { scope: string; target: string },
  channel: Channel,
  count: number
): Promise<Plan> {
  const data = await load();
  const plan: Plan = {
    id: generateId(), brief, channel, count,
    pillars: [], items: [], createdAt: now(), updatedAt: now(),
  };
  data.plans.push(plan);
  await save(data);
  return plan;
}

export async function updatePlan(
  id: string,
  updates: Partial<Pick<Plan, "pillars" | "count" | "channel">>
): Promise<Plan | null> {
  const data = await load();
  const p = data.plans.find((x) => x.id === id);
  if (!p) return null;
  Object.assign(p, updates, { updatedAt: now() });
  await save(data);
  return p;
}

export async function addPlanItem(
  id: string,
  item: { pillar: string; topic: string }
): Promise<Plan | null> {
  const data = await load();
  const p = data.plans.find((x) => x.id === id);
  if (!p) return null;
  const nextId = p.items.reduce((m, i) => Math.max(m, i.id), 0) + 1;
  const newItem: PlanItem = { id: nextId, pillar: item.pillar, topic: item.topic, status: "planned", carouselId: null };
  p.items.push(newItem);
  p.updatedAt = now();
  await save(data);
  return p;
}

export async function replacePlanItems(id: string, items: PlanItem[]): Promise<Plan | null> {
  const data = await load();
  const p = data.plans.find((x) => x.id === id);
  if (!p) return null;
  p.items = items;
  p.updatedAt = now();
  await save(data);
  return p;
}

export async function deletePlan(id: string): Promise<boolean> {
  const data = await load();
  const n = data.plans.length;
  data.plans = data.plans.filter((p) => p.id !== id);
  if (data.plans.length === n) return false;
  await save(data);
  return true;
}
