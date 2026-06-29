import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/lib/chat-system-prompt";
import { POGON_SEED, STUDIO_SOLUTA_SEED, blankBrandTemplate } from "@/lib/brand-seed";
import type { Carousel, Channel } from "@/types/carousel";

function carousel(channel: Channel): Carousel {
  return { id: "c1", projectId: "studio-soluta", name: "t", aspectRatio: "4:5", channel, slides: [],
    referenceImages: [], chatSessionId: null, isTemplate: false, tags: [],
    createdAt: "", updatedAt: "" };
}

describe("buildSystemPrompt chain", () => {
  it("includes the 5-step chain and structured-not-HTML rule", () => {
    const p = buildSystemPrompt(STUDIO_SOLUTA_SEED, carousel("instagram"));
    expect(p).toContain("인사이트");
    expect(p).toContain("앵글");
    expect(p).toContain("아웃라인");
    expect(p).toMatch(/headline/);
    expect(p).toMatch(/자유 HTML|HTML을 직접/);
  });
  it("lists banned words", () => {
    expect(buildSystemPrompt(STUDIO_SOLUTA_SEED, carousel("instagram"))).toContain("혁신적");
  });
  it("switches voice by channel", () => {
    expect(buildSystemPrompt(STUDIO_SOLUTA_SEED, carousel("instagram"))).toContain("합니다체");
    expect(buildSystemPrompt(STUDIO_SOLUTA_SEED, carousel("threads"))).toMatch(/캐주얼|구어체/);
  });
  it("includes POGON context and studio leakage guard", () => {
    const p = buildSystemPrompt(POGON_SEED, carousel("instagram"));
    expect(p).toContain("구름형 캐릭터");
    expect(p).toContain("파란 물결선");
    expect(p).toContain("포곤 캐릭터를 생략한 텍스트 카드만의 구성");
    expect(p).toContain("고양이 또는 실타래 캐릭터 사용");
    expect(p).toContain("generic skincare tips");
    expect(p).toContain("Brand language");
    expect(p).toContain("Creative guides");
    expect(p).toContain("SlidePlan");
    expect(p).toContain("AssetPlan");
    expect(p).toContain("minimum media slides: 2");
    expect(p).toContain("forbid-same-src");
    expect(p).toContain("브레인 포그");
    expect(p).toContain("기준이 필요합니다");
    expect(p).toContain("제작 도구 브랜드명");
    expect(p).not.toMatch(/studio[.\s]soluta/i);
    expect(p).not.toContain("STUDIO.SOLUTA");
  });
  it("stops generation when brand is not configured", () => {
    const p = buildSystemPrompt(blankBrandTemplate(), carousel("instagram"));
    expect(p).toContain("Brand not configured");
    expect(p).toContain("Do not create slides");
    expect(p).not.toContain("Use professional defaults");
  });
  it("uses the current app origin for API calls", () => {
    const p = buildSystemPrompt(
      STUDIO_SOLUTA_SEED,
      carousel("instagram"),
      null,
      "http://127.0.0.1:3107"
    );
    expect(p).toContain("http://127.0.0.1:3107/api/carousels/c1/slides");
    expect(p).not.toContain("http://localhost:3000/api/carousels/c1/slides");
  });
});
