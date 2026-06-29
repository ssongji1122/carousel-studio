import type { BrandConfig } from "@/types/brand";
import type { Carousel, CarouselQualityReport, MediaRef, QualityIssue, Slide } from "@/types/carousel";
import { buildCreativeGuidesFromBrand } from "@/lib/creative-guides";
import type { CreativeGuides } from "@/types/creative-guide";

const TOOL_BRAND_PATTERN = /STUDIO\.SOLUTA|studio[.\s]soluta/i;
const REPEATED_LAYOUT_LIMIT = 3;
const CHARACTER_SCENE_MINIMUM = 2;

export function normalizeMediaSrc(src: string): string {
  const value = src.trim();
  if (!value) return "";
  try {
    const url = new URL(value, "http://carousel.local");
    url.hash = "";
    for (const key of ["v", "w", "width", "h", "height", "q", "quality", "format"]) {
      url.searchParams.delete(key);
    }
    if (url.origin === "http://carousel.local") {
      return `${url.pathname}${url.search}`;
    }
    return url.href;
  } catch {
    return value.replace(/#.*$/, "");
  }
}

export function findDuplicateMediaSource(
  carousel: Carousel,
  media: MediaRef | null | undefined,
  excludeSlideId?: string
): QualityIssue | null {
  const src = media?.src ? normalizeMediaSrc(media.src) : "";
  if (!src) return null;
  const duplicate = carousel.slides.find((slide) => {
    if (slide.id === excludeSlideId) return false;
    return slide.media?.src && normalizeMediaSrc(slide.media.src) === src;
  });
  if (!duplicate) return null;
  return {
    severity: "error",
    code: "duplicate_media_src",
    message: "같은 이미지는 한 캐러셀 안에서 한 번만 사용할 수 있습니다.",
    slideId: excludeSlideId,
    duplicateSlideId: duplicate.id,
    slideOrder: duplicate.order + 1,
  };
}

export function validateCarouselQuality(
  carousel: Carousel,
  brand: BrandConfig,
  guides: CreativeGuides = buildCreativeGuidesFromBrand(brand)
): CarouselQualityReport {
  const issues: QualityIssue[] = [];
  const slidesWithMedia = carousel.slides.filter((slide) => slide.media?.src);
  const seen = new Map<string, Slide>();

  for (const slide of slidesWithMedia) {
    const src = normalizeMediaSrc(slide.media?.src ?? "");
    if (!src) continue;
    const first = seen.get(src);
    if (first) {
      if (guides.image.duplicatePolicy === "forbid-same-src") {
        issues.push({
          severity: "error",
          code: "duplicate_media_src",
          message: "같은 이미지가 여러 슬라이드에 반복됩니다.",
          slideId: slide.id,
          slideOrder: slide.order + 1,
          duplicateSlideId: first.id,
        });
      }
    } else {
      seen.set(src, slide);
    }
  }

  const requiredMediaSlides = requiredMediaSlideCount(carousel, guides);
  if (slidesWithMedia.length < requiredMediaSlides) {
    issues.push({
      severity: "error",
      code: "insufficient_character_media",
      message: `이 브랜드는 이미지/캐릭터 중심입니다. 최소 ${requiredMediaSlides}장에는 서로 다른 이미지가 필요합니다.`,
    });
  }

  const requiredCharacterScenes = requiredCharacterSceneCount(carousel, guides);
  const characterSceneSlides = carousel.slides.filter((slide) => slide.style?.characterScene || slide.style?.characterFrameId);
  if (characterSceneSlides.length < requiredCharacterScenes) {
    issues.push({
      severity: "error",
      code: "insufficient_character_scenes",
      message: `이 브랜드는 캐릭터가 중심입니다. 최소 ${requiredCharacterScenes}장에는 캐릭터 장면이 필요합니다.`,
    });
  }
  issues.push(...invalidCharacterFrameIssues(carousel));
  issues.push(...visionAnalysisIssues(carousel, requiredCharacterScenes));

  issues.push(...toolBrandLeakageIssues(carousel, brand));
  issues.push(...repeatedLayoutIssues(carousel));

  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    issues,
    mediaSlides: slidesWithMedia.length,
    uniqueMedia: seen.size,
    requiredMediaSlides,
  };
}

function visionAnalysisIssues(
  carousel: Carousel,
  requiredCharacterScenes: number
): QualityIssue[] {
  if (requiredCharacterScenes === 0 || carousel.referenceImages.length === 0) return [];
  const unanalyzed = carousel.referenceImages.filter(
    (image) => image.visionAnalysisStatus && image.visionAnalysisStatus !== "ready"
  );
  if (unanalyzed.length === 0) return [];
  return [
    {
      severity: "warning",
      code: "reference_vision_analysis_incomplete",
      message: "레퍼런스 이미지 중 Vision 분석이 완료되지 않은 항목이 있습니다.",
    },
  ];
}

function invalidCharacterFrameIssues(carousel: Carousel): QualityIssue[] {
  if (!carousel.characterSheet) return [];
  const frameIds = new Set(carousel.characterSheet?.frames.map((frame) => frame.id) ?? []);
  return carousel.slides
    .filter((slide) => slide.style?.characterFrameId && !frameIds.has(slide.style.characterFrameId))
    .map((slide) => ({
      severity: "error",
      code: "invalid_character_frame",
      message: "캐릭터시트에 없는 장면 프레임을 사용했습니다.",
      slideId: slide.id,
      slideOrder: slide.order + 1,
    }));
}

function requiredMediaSlideCount(carousel: Carousel, guides: CreativeGuides): number {
  if (carousel.slides.length === 0) return 0;
  return Math.min(guides.image.requiredMediaSlides, carousel.slides.length);
}

function requiredCharacterSceneCount(carousel: Carousel, guides: CreativeGuides): number {
  if (carousel.slides.length === 0 || guides.image.requiredMediaSlides === 0) return 0;
  return Math.min(CHARACTER_SCENE_MINIMUM, carousel.slides.length);
}

function toolBrandLeakageIssues(
  carousel: Carousel,
  brand: BrandConfig
): QualityIssue[] {
  if (TOOL_BRAND_PATTERN.test(brand.name)) return [];
  return carousel.slides
    .filter((slide) => TOOL_BRAND_PATTERN.test(slideText(slide)))
    .map((slide) => ({
      severity: "error",
      code: "tool_brand_leakage",
      message: "결과물에 제작 도구 브랜드명이 섞였습니다.",
      slideId: slide.id,
      slideOrder: slide.order + 1,
    }));
}

function repeatedLayoutIssues(carousel: Carousel): QualityIssue[] {
  let previous = "";
  let count = 0;
  const issues: QualityIssue[] = [];

  for (const slide of carousel.slides) {
    const signature = layoutSignature(slide);
    count = signature === previous ? count + 1 : 1;
    previous = signature;
    if (count === REPEATED_LAYOUT_LIMIT) {
      issues.push({
        severity: "warning",
        code: "repeated_layout_pattern",
        message: "같은 슬라이드 구성이 세 장 연속 반복됩니다.",
        slideId: slide.id,
        slideOrder: slide.order + 1,
      });
    }
  }

  return issues;
}

function layoutSignature(slide: Slide): string {
  const contentKind = slide.items.length > 0 ? "list" : "statement";
  const mediaKind = slide.media?.src ? "media" : "text";
  return [slide.role, slide.tone ?? "auto", contentKind, mediaKind].join(":");
}

function slideText(slide: Slide): string {
  return [
    slide.headline,
    slide.body,
    slide.notes,
    slide.html,
    ...slide.items,
  ].join("\n");
}
