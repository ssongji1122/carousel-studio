import { describe, expect, it } from "vitest";
import { POGON_SEED, STUDIO_SOLUTA_SEED } from "@/lib/brand-seed";
import { buildCreativeGuidesFromBrand } from "@/lib/creative-guides";
import {
  findDuplicateMediaSource,
  normalizeMediaSrc,
  validateCarouselQuality,
} from "@/lib/carousel-quality";
import type { Carousel, MediaRef, Slide } from "@/types/carousel";

const imageA: MediaRef = {
  type: "image",
  src: "https://cdn.example.com/pogon.png?v=1",
  fit: "contain",
  source: "uploaded",
};

const imageB: MediaRef = {
  type: "image",
  src: "https://cdn.example.com/pogon-side.png",
  fit: "contain",
  source: "uploaded",
};

function slide(
  order: number,
  media: MediaRef | null = null,
  characterScene?: NonNullable<Slide["style"]>["characterScene"],
  characterFrameId?: string
): Slide {
  return {
    id: `s${order}`,
    html: "",
    previousVersions: [],
    order,
    notes: "",
    role: order === 0 ? "hook" : "body",
    headline: `slide ${order + 1}`,
    body: "",
    items: [],
    media,
    ...(characterScene || characterFrameId ? { style: { characterScene, characterFrameId } } : {}),
  };
}

function carousel(slides: Slide[]): Carousel {
  return {
    id: "c1",
    projectId: "sample-pogon",
    name: "test",
    aspectRatio: "4:5",
    channel: "instagram",
    slides,
    referenceImages: [],
    chatSessionId: null,
    isTemplate: false,
    tags: [],
    createdAt: "",
    updatedAt: "",
  };
}

describe("carousel quality", () => {
  it("normalizes common cache-busting variants", () => {
    expect(normalizeMediaSrc("https://cdn.example.com/a.png?v=1&w=800#top")).toBe(
      "https://cdn.example.com/a.png"
    );
  });

  it("finds duplicate media sources in one carousel", () => {
    const c = carousel([slide(0, imageA), slide(1, null)]);
    const issue = findDuplicateMediaSource(c, {
      ...imageA,
      src: "https://cdn.example.com/pogon.png?v=2",
    });
    expect(issue?.code).toBe("duplicate_media_src");
    expect(issue?.duplicateSlideId).toBe("s0");
  });

  it("requires at least two media slides for a character-led brand", () => {
    const report = validateCarouselQuality(
      carousel([slide(0, imageA), slide(1), slide(2), slide(3), slide(4)]),
      POGON_SEED,
      buildCreativeGuidesFromBrand(POGON_SEED)
    );
    expect(report.ok).toBe(false);
    expect(report.requiredMediaSlides).toBe(2);
    expect(report.issues.some((issue) => issue.code === "insufficient_character_media")).toBe(true);
  });

  it("requires character scenes for a character-led brand", () => {
    const report = validateCarouselQuality(
      carousel([slide(0, imageA), slide(1), slide(2, imageB), slide(3), slide(4)]),
      POGON_SEED,
      buildCreativeGuidesFromBrand(POGON_SEED)
    );
    expect(report.ok).toBe(false);
    expect(report.issues.some((issue) => issue.code === "insufficient_character_scenes")).toBe(true);
  });

  it("passes when a character-led carousel has media and character scenes", () => {
    const report = validateCarouselQuality(
      carousel([
        slide(0, imageA, "tired"),
        slide(1),
        slide(2, imageB),
        slide(3, null, "rollon"),
        slide(4),
      ]),
      POGON_SEED,
      buildCreativeGuidesFromBrand(POGON_SEED)
    );
    expect(report.ok).toBe(true);
    expect(report.mediaSlides).toBe(2);
    expect(report.uniqueMedia).toBe(2);
  });

  it("accepts character sheet frame ids as character scenes", () => {
    const c = carousel([
      slide(0, imageA, undefined, "tired-hold-head"),
      slide(1),
      slide(2, imageB),
      slide(3, null, undefined, "use-rollon"),
      slide(4),
    ]);
    c.characterSheet = {
      id: "sheet-1",
      generatedAt: "",
      source: "brand-kit",
      signals: [],
      frames: [
        {
          id: "tired-hold-head",
          label: "머리가 무겁고 피곤한 장면",
          scene: "tired",
          expression: "tired",
          action: "hold-head",
          visualCues: [],
          referenceImageIds: [],
        },
        {
          id: "use-rollon",
          label: "포곤 롤온을 쓰는 장면",
          scene: "rollon",
          expression: "focused",
          action: "use-rollon",
          visualCues: [],
          referenceImageIds: [],
        },
      ],
    };
    const report = validateCarouselQuality(
      c,
      POGON_SEED,
      buildCreativeGuidesFromBrand(POGON_SEED)
    );
    expect(report.ok).toBe(true);
  });

  it("blocks character frame ids missing from the character sheet", () => {
    const c = carousel([
      slide(0, imageA, undefined, "missing-frame"),
      slide(1),
      slide(2, imageB),
      slide(3, null, "rollon"),
      slide(4),
    ]);
    c.characterSheet = {
      id: "sheet-1",
      generatedAt: "",
      source: "brand-kit",
      signals: [],
      frames: [],
    };
    const report = validateCarouselQuality(
      c,
      POGON_SEED,
      buildCreativeGuidesFromBrand(POGON_SEED)
    );
    expect(report.ok).toBe(false);
    expect(report.issues.some((issue) => issue.code === "invalid_character_frame")).toBe(true);
  });

  it("warns when reference vision analysis is still pending", () => {
    const c = carousel([
      slide(0, imageA, "tired"),
      slide(1),
      slide(2, imageB),
      slide(3, null, "rollon"),
      slide(4),
    ]);
    c.referenceImages = [
      {
        id: "ref-1",
        url: "/uploads/ref.png",
        absPath: "/tmp/ref.png",
        name: "reference",
        addedAt: "",
        visionAnalysisStatus: "pending",
      },
    ];
    const report = validateCarouselQuality(
      c,
      POGON_SEED,
      buildCreativeGuidesFromBrand(POGON_SEED)
    );
    expect(report.ok).toBe(true);
    expect(report.issues.some((issue) => issue.code === "reference_vision_analysis_incomplete")).toBe(true);
  });

  it("does not require media for a non-character brand", () => {
    const report = validateCarouselQuality(
      carousel([slide(0), slide(1), slide(2), slide(3), slide(4)]),
      STUDIO_SOLUTA_SEED
    );
    expect(report.requiredMediaSlides).toBe(0);
    expect(report.ok).toBe(true);
  });

  it("blocks tool brand leakage for a non-tool brand", () => {
    const leaked = slide(0, imageA);
    leaked.headline = "STUDIO.SOLUTA";
    const report = validateCarouselQuality(
      carousel([leaked, slide(1, imageB), slide(2), slide(3), slide(4)]),
      POGON_SEED,
      buildCreativeGuidesFromBrand(POGON_SEED)
    );

    expect(report.ok).toBe(false);
    expect(report.issues.some((issue) => issue.code === "tool_brand_leakage")).toBe(true);
  });

  it("warns when the same slide layout repeats three times in a row", () => {
    const report = validateCarouselQuality(
      carousel([slide(0), slide(1), slide(2), slide(3)]),
      STUDIO_SOLUTA_SEED
    );

    expect(report.ok).toBe(true);
    expect(report.issues.some((issue) => issue.code === "repeated_layout_pattern")).toBe(true);
  });
});
