import { describe, it, expect, vi, beforeEach, type MockedFunction } from "vitest";
import { POGON_SEED, blankBrandTemplate } from "@/lib/brand-seed";
import type { StylePreset } from "@/types/style-preset";

vi.mock("@/lib/brand", () => ({
  getBrand: vi.fn(),
  isBrandConfigured: vi.fn((brand: { name: string }) => brand.name.trim().length > 0),
}));

vi.mock("@/lib/style-presets", () => ({
  getPreset: vi.fn(),
}));

vi.mock("@/lib/project-sources", () => ({
  getProjectSourceStatus: vi.fn(),
}));

const brandModule = await import("@/lib/brand") as typeof import("@/lib/brand") & {
  getBrand: MockedFunction<typeof import("@/lib/brand").getBrand>;
};
const presetModule = await import("@/lib/style-presets") as typeof import("@/lib/style-presets") & {
  getPreset: MockedFunction<typeof import("@/lib/style-presets").getPreset>;
};
const sourcesModule = await import("@/lib/project-sources") as typeof import("@/lib/project-sources") & {
  getProjectSourceStatus: MockedFunction<typeof import("@/lib/project-sources").getProjectSourceStatus>;
};
const { getProjectContext, requireConfiguredProjectContext } = await import(
  "@/lib/project-context"
);

const preset = (projectId: string, scope: StylePreset["scope"] = "project") =>
  ({
    id: "preset-1",
    projectId,
    scope,
    name: "preset",
    description: "",
    brand: POGON_SEED,
    designRules: "",
    exampleSlideHtml: "",
    aspectRatio: "4:5",
    tags: [],
    createdAt: "",
  }) satisfies StylePreset;

describe("ProjectContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    presetModule.getPreset.mockResolvedValue(null);
    sourcesModule.getProjectSourceStatus.mockResolvedValue({
      projectId: "sample-pogon",
      docs: [],
      requiredMissing: ["brand", "design", "voice"],
      complete: false,
    });
  });

  it("binds brand, voice, asset hints, and style preset to one project", async () => {
    brandModule.getBrand.mockResolvedValue(POGON_SEED);
    presetModule.getPreset.mockResolvedValue(preset("sample-pogon"));

    const context = await getProjectContext("sample-pogon", {
      stylePresetId: "preset-1",
    });

    expect(context.projectId).toBe("sample-pogon");
    expect(context.brand.name).toBe("포곤 FOGGONE");
    expect(context.brandConfigured).toBe(true);
    expect(context.assetHints).toContain("크림색 구름형 포곤 캐릭터");
    expect(context.voice.keywords).toContain("명료함");
    expect(context.stylePreset?.projectId).toBe("sample-pogon");
    expect(context.sourceStatus.requiredMissing).toEqual(["brand", "design", "voice"]);
    expect(context.creativeGuides.image.character).toContain("구름형 캐릭터");
    expect(JSON.stringify(context.creativeGuides)).not.toMatch(/studio[.\s]soluta/i);
  });

  it("throws when a brand is not configured", () => {
    expect(() =>
      requireConfiguredProjectContext({
        projectId: "new-brand",
        brand: blankBrandTemplate(),
        brandConfigured: false,
        stylePreset: null,
        assetHints: [],
        voice: blankBrandTemplate().voice,
        sourceStatus: {
          projectId: "new-brand",
          docs: [],
          requiredMissing: ["brand", "design", "voice"],
          complete: false,
        },
        creativeGuides: {
          strategy: {
            brandName: "브랜드 설정 필요",
            audience: "",
            goal: "",
            angle: "",
            coreMessage: "",
            cta: "",
          },
          copy: {
            ending: "합니다체",
            preferredPhrases: [],
            avoidPhrases: [],
            headlinePatterns: [],
            writingRules: [],
            sampleLines: [],
            banned: [],
          },
          image: {
            character: "",
            visualTone: [],
            assetHints: [],
            forbiddenDirections: [],
            requiredMediaSlides: 0,
            duplicatePolicy: "forbid-same-src",
          },
          slidePlan: { slides: [], minSlides: 0, maxSlides: 0 },
          assetPlan: { requiredAssets: [], optionalAssets: [], missingAssetRisks: [] },
        },
      })
    ).toThrow("Brand settings are required");
  });

  it("blocks a project-scoped style preset from another project", async () => {
    brandModule.getBrand.mockResolvedValue(POGON_SEED);
    presetModule.getPreset.mockResolvedValue(preset("studio-soluta"));

    await expect(
      getProjectContext("sample-pogon", { stylePresetId: "preset-1" })
    ).rejects.toThrow("Style preset does not belong");
  });
});
