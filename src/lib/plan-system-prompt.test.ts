import { describe, it, expect } from "vitest";
import { buildPlannerPrompt } from "@/lib/plan-system-prompt";
import { POGON_SEED, STUDIO_SOLUTA_SEED, blankBrandTemplate } from "@/lib/brand-seed";
import type { Channel } from "@/types/carousel";
import type { Plan } from "@/types/plan";

function plan(channel: Channel): Plan {
  return { id: "p1", brief: { scope: "1인 디자인 스튜디오", target: "소상공인" },
    projectId: "studio-soluta", channel, count: 6, pillars: [], items: [],
    createdAt: "", updatedAt: "" };
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
  it("carries POGON brand kit into planning", () => {
    const p = buildPlannerPrompt(POGON_SEED, plan("instagram"));
    expect(p).toContain("구름형 캐릭터");
    expect(p).toContain("파란 물결선");
    expect(p).toContain("포곤 캐릭터를 생략한 텍스트 카드만의 구성");
    expect(p).toContain("고양이 또는 실타래 캐릭터 사용");
    expect(p).toContain("일반적인 피부 관리 팁");
    expect(p).toContain("Brand language");
    expect(p).toContain("Creative guides");
    expect(p).toContain("StrategyBrief");
    expect(p).toContain("CopyGuide");
    expect(p).toContain("ImageGuide");
    expect(p).toContain("minimum media slides: 2");
    expect(p).toContain("브레인 포그");
    expect(p).toContain("자극보다 정돈");
    expect(p).not.toMatch(/studio[.\s]soluta/i);
    expect(p).not.toContain("STUDIO.SOLUTA");
  });
  it("does not plan when brand is not configured", () => {
    const p = buildPlannerPrompt(blankBrandTemplate(), plan("instagram"));
    expect(p).toContain("브랜드 설정이 필요합니다");
    expect(p).toContain("주제를 만들지 말고");
  });
  it("uses the current app origin for item API calls", () => {
    const p = buildPlannerPrompt(
      STUDIO_SOLUTA_SEED,
      plan("instagram"),
      "http://127.0.0.1:3107"
    );
    expect(p).toContain("http://127.0.0.1:3107/api/plans/p1/items");
    expect(p).not.toContain("http://localhost:3000/api/plans/p1/items");
  });
});
