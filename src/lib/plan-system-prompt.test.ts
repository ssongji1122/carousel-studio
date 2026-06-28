import { describe, it, expect } from "vitest";
import { buildPlannerPrompt } from "@/lib/plan-system-prompt";
import { STUDIO_SOLUTA_SEED } from "@/lib/brand-seed";
import type { Plan } from "@/types/plan";

function plan(channel: "instagram" | "threads"): Plan {
  return {
    id: "p1",
    projectId: "studio-soluta",
    brief: { scope: "1인 디자인 스튜디오", target: "소상공인" },
    channel,
    count: 6,
    pillars: [],
    items: [],
    createdAt: "",
    updatedAt: "",
  };
}

describe("buildPlannerPrompt", () => {
  it("instructs pillars, N topics, and POST to items endpoint", () => {
    const p = buildPlannerPrompt(STUDIO_SOLUTA_SEED, plan("instagram"));
    expect(p).toContain("필러");
    expect(p).toMatch(/주제/);
    expect(p).toContain("/api/plans/p1/items");
    expect(p).toMatch(/6/);
    expect(p).toMatch(/슬라이드.*만들지|HTML/);
  });
  it("lists banned words and switches voice by channel", () => {
    expect(buildPlannerPrompt(STUDIO_SOLUTA_SEED, plan("instagram"))).toContain("혁신적");
    expect(buildPlannerPrompt(STUDIO_SOLUTA_SEED, plan("instagram"))).toContain("합니다체");
    expect(buildPlannerPrompt(STUDIO_SOLUTA_SEED, plan("threads"))).toMatch(/캐주얼|구어체/);
  });
  it("uses the current app origin for item creation", () => {
    const p = buildPlannerPrompt(
      STUDIO_SOLUTA_SEED,
      plan("instagram"),
      "http://localhost:3200"
    );
    expect(p).toContain("http://localhost:3200/api/plans/p1/items");
    expect(p).not.toContain("http://localhost:3000/api/plans/p1/items");
  });
});
