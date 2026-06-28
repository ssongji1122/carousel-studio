import { describe, it, expect, vi } from "vitest";
import type { Plan, PlanItem } from "@/types/plan";

const created: string[] = [];
vi.mock("@/lib/carousels", () => ({
  createCarousel: vi.fn(async (_projectId: string, name: string) => {
    const cid = "car-" + created.length;
    created.push(name);
    return { id: cid, name };
  }),
  updateCarousel: vi.fn(async (id: string) => ({ id })),
}));
vi.mock("@/lib/plans", () => ({
  replacePlanItems: vi.fn(async (_id: string, items: PlanItem[]) => ({ items })),
}));

const { fanoutPlan } = await import("@/lib/plan-fanout");
const { updateCarousel } = await import("@/lib/carousels");

describe("fanoutPlan", () => {
  it("creates one carousel per uncreated item and marks them created", async () => {
    const plan: Plan = {
      id: "p1",
      projectId: "studio-soluta",
      channel: "threads",
      brief: { scope: "s", target: "t" },
      count: 2,
      pillars: [],
      items: [
        { id: 1, pillar: "교육", topic: "A", status: "planned", carouselId: null },
        { id: 2, pillar: "인사이트", topic: "B", status: "planned", carouselId: null },
      ],
      createdAt: "",
      updatedAt: "",
    };
    const out = await fanoutPlan(plan);
    expect(created).toEqual(["A", "B"]);
    expect(out.items.every((i) => i.status === "created" && i.carouselId)).toBe(true);
    expect(updateCarousel).toHaveBeenCalledWith(
      expect.any(String),
      { channel: "threads", tags: ["교육"] },
    );
    expect(updateCarousel).toHaveBeenCalledWith(
      expect.any(String),
      { channel: "threads", tags: ["인사이트"] },
    );
  });

  it("skips already-created items", async () => {
    created.length = 0;
    const plan: Plan = {
      id: "p2",
      projectId: "studio-soluta",
      channel: "instagram",
      brief: { scope: "s", target: "t" },
      count: 2,
      pillars: [],
      items: [
        { id: 1, pillar: "x", topic: "C", status: "created", carouselId: "existing" },
        { id: 2, pillar: "y", topic: "D", status: "planned", carouselId: null },
      ],
      createdAt: "",
      updatedAt: "",
    };
    const out = await fanoutPlan(plan);
    expect(created).toEqual(["D"]);
    expect(out.items[0].carouselId).toBe("existing");
    expect(out.items[1].status).toBe("created");
    expect(out.items[1].carouselId).toBeTruthy();
  });
});
