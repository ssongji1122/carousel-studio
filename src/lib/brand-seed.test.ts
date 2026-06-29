import { describe, it, expect } from "vitest";
import { POGON_SEED, STUDIO_SOLUTA_SEED } from "@/lib/brand-seed";

describe("STUDIO_SOLUTA_SEED", () => {
  it("maps studio.soluta tokens and moss accent", () => {
    expect(STUDIO_SOLUTA_SEED.colors.background).toBe("#F5F4F0");
    expect(STUDIO_SOLUTA_SEED.colors.accent).toBe("#697C70");
    expect(STUDIO_SOLUTA_SEED.fonts.heading).toBe("Cormorant Garamond");
    expect(STUDIO_SOLUTA_SEED.fonts.body).toBe("Pretendard Variable");
  });
  it("carries voice with banned words", () => {
    expect(STUDIO_SOLUTA_SEED.voice.ending).toBe("합니다체");
    expect(STUDIO_SOLUTA_SEED.voice.banned).toContain("혁신적");
    expect(STUDIO_SOLUTA_SEED.voice.banned).toContain("솔루션");
    expect(STUDIO_SOLUTA_SEED.voice.language?.sampleLines).toContain("흩어진 일을 다시 볼 수 있게");
  });
});

describe("POGON_SEED", () => {
  it("carries the POGON brand kit without borrowing another character", () => {
    expect(POGON_SEED.name).toBe("포곤 FOGGONE");
    expect(POGON_SEED.kit?.character).toContain("구름형 캐릭터");
    expect(POGON_SEED.kit?.character).toContain("초록 잎");
    expect(POGON_SEED.kit?.character).toContain("파란 물결선");
    expect(POGON_SEED.kit?.metaphor).toContain("머릿속 안개");
    expect(POGON_SEED.voice.keywords).toContain("명료함");
    expect(POGON_SEED.voice.keywords).not.toContain("흰 고양이");
    expect(POGON_SEED.voice.keywords).not.toContain("실타래");
    expect(POGON_SEED.voice.language?.preferredPhrases).toContain("브레인 포그");
    expect(POGON_SEED.voice.language?.avoidPhrases).toContain("기준이 필요합니다");
  });

  it("blocks generic skincare and production-brand leakage directions", () => {
    expect(POGON_SEED.voice.banned).toContain("generic skincare tips");
    expect(POGON_SEED.kit?.forbiddenDirections).toContain("제작 도구 브랜드 노출");
    expect(POGON_SEED.kit?.forbiddenDirections).toContain("고양이 또는 실타래 캐릭터 사용");
    expect(POGON_SEED.kit?.forbiddenDirections).toContain("포곤 캐릭터를 생략한 텍스트 카드만의 구성");
  });
});
