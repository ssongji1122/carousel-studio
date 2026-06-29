import { describe, expect, it } from "vitest";
import { POGON_SEED, blankBrandTemplate } from "@/lib/brand-seed";
import { buildCreativeGuidesFromBrand } from "@/lib/creative-guides";

describe("buildCreativeGuidesFromBrand", () => {
  it("preserves character, voice, and media requirements for a character-led brand", () => {
    const guides = buildCreativeGuidesFromBrand(POGON_SEED);

    expect(guides.strategy.brandName).toBe("포곤 FOGGONE");
    expect(guides.strategy.coreMessage).toContain("브레인 포그");
    expect(guides.copy.preferredPhrases).toContain("브레인 포그");
    expect(guides.copy.avoidPhrases).toContain("흰 고양이");
    expect(guides.image.character).toContain("구름형 캐릭터");
    expect(guides.image.requiredMediaSlides).toBeGreaterThanOrEqual(2);
    expect(guides.image.duplicatePolicy).toBe("forbid-same-src");
    expect(guides.assetPlan.requiredAssets).toContain("크림색 구름형 포곤 캐릭터");
    expect(guides.assetPlan.missingAssetRisks).toContain(
      "캐릭터 중심 브랜드인데 실제 캐릭터 이미지가 없으면 결과물이 텍스트 카드처럼 보일 수 있습니다."
    );
    expect(guides.slidePlan.slides.filter((slide) => slide.mediaRequired)).toHaveLength(2);
    expect(JSON.stringify(guides)).not.toMatch(/studio[.\s]soluta/i);
  });

  it("keeps an unconfigured brand in a setup-needed state without studio.soluta fallback", () => {
    const guides = buildCreativeGuidesFromBrand(blankBrandTemplate());
    const serialized = JSON.stringify(guides);

    expect(guides.strategy.brandName).toBe("브랜드 설정 필요");
    expect(guides.image.requiredMediaSlides).toBe(0);
    expect(guides.assetPlan.requiredAssets).toEqual([]);
    expect(serialized).not.toContain("studio.soluta");
    expect(serialized).not.toContain("STUDIO.SOLUTA");
  });
});
