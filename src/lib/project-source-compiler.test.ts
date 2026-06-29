import { describe, expect, it } from "vitest";
import { POGON_SEED, blankBrandTemplate } from "@/lib/brand-seed";
import { compileProjectSourceDocsFromBrand } from "@/lib/project-source-compiler";

describe("compileProjectSourceDocsFromBrand", () => {
  it("creates project source docs from POGON without leaking tool brand names", () => {
    const docs = compileProjectSourceDocsFromBrand(POGON_SEED);
    const byKey = Object.fromEntries(docs.map((doc) => [doc.key, doc.content]));
    const serialized = docs.map((doc) => doc.content).join("\n\n");

    expect(docs.map((doc) => doc.key)).toEqual([
      "brand",
      "design",
      "voice",
      "assets",
      "generation-rules",
    ]);
    expect(byKey.brand).toContain("포곤 FOGGONE");
    expect(byKey.brand).toContain("구름형 캐릭터");
    expect(byKey.design).toContain("Pretendard");
    expect(byKey.voice).toContain("브레인 포그");
    expect(byKey.assets).toContain("포곤 집중 루틴세트 패키지");
    expect(byKey["generation-rules"]).toContain("다른 프로젝트나 제작 도구 표현");
    expect(serialized).not.toMatch(/studio[.\s]soluta/i);
    expect(serialized).not.toContain("STUDIO.SOLUTA");
  });

  it("keeps blank projects in setup-needed docs without borrowing studio defaults", () => {
    const docs = compileProjectSourceDocsFromBrand(blankBrandTemplate());
    const serialized = docs.map((doc) => doc.content).join("\n\n");

    expect(serialized).toContain("브랜드 설정 필요");
    expect(serialized).toContain("브랜드 설명 필요");
    expect(serialized).not.toMatch(/studio[.\s]soluta/i);
    expect(serialized).not.toContain("STUDIO.SOLUTA");
  });
});
