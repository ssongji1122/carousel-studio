import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PlansData } from "@/types/plan";

vi.mock("@/lib/data", () => {
  let store: PlansData = { plans: [] };
  return {
    readDataSafe: vi.fn(async (_f: string, _fallback: PlansData) => store),
    writeData: vi.fn(async (_f: string, data: PlansData) => {
      store = data;
    }),
    ensureDataDir: vi.fn(async () => {}),
  };
});

const plans = await import("@/lib/plans");

describe("plans data layer", () => {
  beforeEach(async () => {
    for (const p of await plans.listPlans()) await plans.deletePlan(p.id);
  });

  it("creates a plan with brief, channel, count and empty items", async () => {
    const p = await plans.createPlan("studio-soluta", { scope: "1인 디자인 스튜디오", target: "소상공인" }, "instagram", 6);
    expect(p.id).toBeTruthy();
    expect(p.channel).toBe("instagram");
    expect(p.count).toBe(6);
    expect(p.items).toEqual([]);
    expect(p.pillars).toEqual([]);
  });

  it("appends items with incrementing ids and planned status", async () => {
    const p = await plans.createPlan("studio-soluta", { scope: "s", target: "t" }, "threads", 3);
    await plans.addPlanItem(p.id, { pillar: "교육", topic: "주제1" });
    const after = await plans.addPlanItem(p.id, { pillar: "인사이트", topic: "주제2" });
    expect(after!.items.map((i) => i.id)).toEqual([1, 2]);
    expect(after!.items[0]).toMatchObject({ pillar: "교육", topic: "주제1", status: "planned", carouselId: null });
  });

  it("replaces items (edit checkpoint)", async () => {
    const p = await plans.createPlan("studio-soluta", { scope: "s", target: "t" }, "instagram", 2);
    await plans.addPlanItem(p.id, { pillar: "a", topic: "x" });
    const edited = await plans.replacePlanItems(p.id, [
      { id: 1, pillar: "a", topic: "수정됨", status: "planned", carouselId: null },
    ]);
    expect(edited!.items[0].topic).toBe("수정됨");
  });
});
