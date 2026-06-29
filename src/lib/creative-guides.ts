import type { BrandConfig, BrandKit, BrandLanguage } from "@/types/brand";
import {
  sanitizeToolBrandReferenceList,
  sanitizeToolBrandReferences,
} from "@/lib/brand-text";
import type {
  AssetPlan,
  CopyGuide,
  CreativeGuides,
  ImageGuide,
  SlidePlan,
  StrategyBrief,
} from "@/types/creative-guide";

const SETUP_NEEDED_BRAND_NAME = "브랜드 설정 필요";
const DEFAULT_AUDIENCE = "브랜드의 현재 고객과 잠재 고객";
const DEFAULT_GOAL = "브랜드 맥락을 지키는 저장형 캐러셀 생성";
const DEFAULT_CTA = "오늘의 루틴을 점검합니다";
const CHARACTER_MEDIA_MINIMUM = 2;

export function buildCreativeGuidesFromBrand(brand: BrandConfig): CreativeGuides {
  const brandName = brand.name.trim() || SETUP_NEEDED_BRAND_NAME;
  const kit = brand.kit;
  const hasCharacter = Boolean(kit?.character.trim());

  return {
    strategy: buildStrategyBrief(brandName, kit),
    copy: buildCopyGuide(brand.voice.ending, brand.voice.banned, brand.voice.language),
    image: buildImageGuide(kit, hasCharacter),
    slidePlan: buildSlidePlan(hasCharacter),
    assetPlan: buildAssetPlan(kit, hasCharacter),
  };
}

function buildStrategyBrief(
  brandName: string,
  kit: BrandKit | undefined
): StrategyBrief {
  return {
    brandName,
    audience: DEFAULT_AUDIENCE,
    goal: DEFAULT_GOAL,
    angle: sanitizeToolBrandReferences(kit?.metaphor || "브랜드 고유 관점 정리 필요"),
    coreMessage: sanitizeToolBrandReferences(
      kit?.description || "브랜드 설명과 핵심 메시지 설정이 필요합니다."
    ),
    cta: DEFAULT_CTA,
  };
}

function buildCopyGuide(
  ending: string,
  banned: readonly string[],
  language: BrandLanguage | undefined
): CopyGuide {
  return {
    ending: ending || "합니다체",
    preferredPhrases: sanitizeToolBrandReferenceList(language?.preferredPhrases),
    avoidPhrases: sanitizeToolBrandReferenceList(language?.avoidPhrases),
    headlinePatterns: sanitizeToolBrandReferenceList(language?.headlinePatterns),
    writingRules: sanitizeToolBrandReferenceList(language?.writingRules),
    sampleLines: sanitizeToolBrandReferenceList(language?.sampleLines),
    banned: sanitizeToolBrandReferenceList(banned),
  };
}

function buildImageGuide(
  kit: BrandKit | undefined,
  hasCharacter: boolean
): ImageGuide {
  return {
    character: sanitizeToolBrandReferences(
      kit?.character || "캐릭터 또는 대표 이미지 기준 필요"
    ),
    visualTone: sanitizeToolBrandReferenceList(kit?.visualTone),
    assetHints: sanitizeToolBrandReferenceList(kit?.assetHints),
    forbiddenDirections: sanitizeToolBrandReferenceList(kit?.forbiddenDirections),
    requiredMediaSlides: hasCharacter ? CHARACTER_MEDIA_MINIMUM : 0,
    duplicatePolicy: "forbid-same-src",
  };
}

function buildSlidePlan(hasCharacter: boolean): SlidePlan {
  return {
    minSlides: 5,
    maxSlides: 7,
    slides: [
      {
        role: "hook",
        purpose: hasCharacter
          ? "캐릭터가 겪는 문제 상황을 첫 장에서 보여줍니다."
          : "브랜드의 핵심 감정이나 문제 상황을 첫 장에서 보여줍니다.",
        mediaRequired: hasCharacter,
        copyIntent: hasCharacter
          ? "style.characterScene=tired를 우선 사용하고, 브랜드 원문 언어에서 나온 짧은 장면형 문장"
          : "브랜드 원문 언어에서 나온 짧은 장면형 문장",
      },
      {
        role: "body",
        purpose: "사용자가 겪는 상황을 브랜드의 관점으로 좁힙니다.",
        mediaRequired: false,
        copyIntent: "일반론보다 브랜드가 보는 문제 정의",
      },
      {
        role: "body",
        purpose: "루틴, 기준, 순서 중 하나를 실제 행동 단위로 제안합니다.",
        mediaRequired: false,
        copyIntent: hasCharacter
          ? "style.characterScene=rollon 또는 patch로 캐릭터가 제품을 사용하는 한 행동"
          : "한 슬라이드에 하나의 행동",
      },
      {
        role: "body",
        purpose: hasCharacter
          ? "캐릭터 표정 변화나 제품 사용 장면으로 기억점을 만듭니다."
          : "제품, 캐릭터, 상징 이미지 중 하나로 기억점을 만듭니다.",
        mediaRequired: hasCharacter,
        copyIntent: hasCharacter
          ? "style.characterScene=relieved를 우선 사용하고 한 문장만 보완"
          : "이미지가 설명하지 못하는 한 문장만 보완",
      },
      {
        role: "cta",
        purpose: "저장, 댓글, 루틴 점검 같은 다음 행동으로 닫습니다.",
        mediaRequired: false,
        copyIntent: "브랜드 말투에 맞는 낮은 압력의 행동 유도",
      },
    ],
  };
}

function buildAssetPlan(
  kit: BrandKit | undefined,
  hasCharacter: boolean
): AssetPlan {
  const assetHints = sanitizeToolBrandReferenceList(kit?.assetHints);
  return {
    requiredAssets: hasCharacter ? assetHints.slice(0, 3) : [],
    optionalAssets: hasCharacter ? assetHints.slice(3) : [...assetHints],
    missingAssetRisks: hasCharacter
      ? [
          "캐릭터 중심 브랜드인데 실제 캐릭터 이미지가 없으면 결과물이 텍스트 카드처럼 보일 수 있습니다.",
        ]
      : [],
  };
}
