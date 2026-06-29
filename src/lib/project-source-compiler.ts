import { getBrand } from "@/lib/brand";
import {
  sanitizeToolBrandReferenceList,
  sanitizeToolBrandReferences,
} from "@/lib/brand-text";
import type { BrandConfig } from "@/types/brand";
import type { ProjectSourceWrite } from "@/types/project-source";

export async function compileProjectSourceDocs(projectId: string): Promise<ProjectSourceWrite[]> {
  return compileProjectSourceDocsFromBrand(await getBrand(projectId));
}

export function compileProjectSourceDocsFromBrand(brand: BrandConfig): ProjectSourceWrite[] {
  return [
    { key: "brand", content: compileBrandMd(brand) },
    { key: "design", content: compileDesignMd(brand) },
    { key: "voice", content: compileVoiceMd(brand) },
    { key: "assets", content: compileAssetsMd(brand) },
    { key: "generation-rules", content: compileGenerationRulesMd(brand) },
  ];
}

function compileBrandMd(brand: BrandConfig): string {
  const kit = brand.kit;
  return [
    `# ${brand.name || "브랜드 설정 필요"}`,
    "",
    "## Identity",
    `- Name: ${brand.name || "미정"}`,
    `- Description: ${safe(kit?.description || "브랜드 설명 필요")}`,
    `- Core metaphor: ${safe(kit?.metaphor || "핵심 메타포 필요")}`,
    `- Character: ${safe(kit?.character || "캐릭터 또는 대표 이미지 기준 필요")}`,
    "",
    "## Emotional Range",
    list(kit?.emotionalRange),
    "",
    "## Forbidden Directions",
    list(kit?.forbiddenDirections),
    "",
    "## Evidence",
    evidenceLines(brand),
  ].join("\n");
}

function compileDesignMd(brand: BrandConfig): string {
  const colors = brand.colors;
  const fonts = brand.fonts;
  return [
    `# ${brand.name || "브랜드"} Design`,
    "",
    "## Colors",
    `- Primary: ${colors.primary}`,
    `- Secondary: ${colors.secondary}`,
    `- Accent: ${colors.accent}`,
    `- Background: ${colors.background}`,
    `- Surface: ${colors.surface}`,
    `- Line: ${colors.line}`,
    colors.dark ? `- Dark: ${colors.dark}` : "",
    colors.accentDark ? `- Accent dark: ${colors.accentDark}` : "",
    "",
    "## Typography",
    `- Heading: ${fonts.heading}`,
    `- Body: ${fonts.body}`,
    `- Mono: ${fonts.mono || "미정"}`,
    "",
    "## Visual Tone",
    list(brand.kit?.visualTone),
    "",
    "## Color Decisions",
    brand.analysis ? decisionLines(brand) : "- 분석 근거 없음",
  ].filter(Boolean).join("\n");
}

function compileVoiceMd(brand: BrandConfig): string {
  const language = brand.voice.language;
  return [
    `# ${brand.name || "브랜드"} Voice`,
    "",
    "## Basics",
    `- Ending: ${brand.voice.ending || "미정"}`,
    `- Keywords: ${formatInlineList(brand.voice.keywords)}`,
    `- Banned: ${formatInlineList(brand.voice.banned)}`,
    "",
    "## Preferred Phrases",
    list(language?.preferredPhrases),
    "",
    "## Avoid Phrases",
    list(language?.avoidPhrases),
    "",
    "## Headline Patterns",
    list(language?.headlinePatterns),
    "",
    "## Writing Rules",
    list(language?.writingRules),
    "",
    "## Sample Lines",
    list(language?.sampleLines),
  ].join("\n");
}

function compileAssetsMd(brand: BrandConfig): string {
  return [
    `# ${brand.name || "브랜드"} Assets`,
    "",
    "## Logo",
    `- Path: ${brand.logoPath || "미정"}`,
    "",
    "## Character / Product Assets",
    list(brand.kit?.assetHints),
    "",
    "## Notes",
    "- 이미지 URL은 중복 사용을 피하고, 캐릭터 중심 브랜드는 캐릭터/제품 이미지가 최소 2장 이상 들어가야 합니다.",
  ].join("\n");
}

function compileGenerationRulesMd(brand: BrandConfig): string {
  return [
    `# ${brand.name || "브랜드"} Generation Rules`,
    "",
    "## Carousel Rules",
    "- HTML을 직접 만들지 않고 구조화된 slide data를 만든 뒤 앱 템플릿으로 렌더링합니다.",
    "- 브랜드명, 색, 폰트, 말투는 현재 프로젝트의 source docs와 BrandAnalysis를 우선합니다.",
    "- 다른 프로젝트나 제작 도구 표현을 자동 fallback으로 쓰지 않습니다.",
    "- 이미지가 필요한 브랜드는 중복 이미지 사용을 피하고 slide media 수를 품질 게이트에서 확인합니다.",
    "",
    "## Repetition Limits",
    list(brand.kit?.repeatLimits),
  ].join("\n");
}

function evidenceLines(brand: BrandConfig): string {
  const evidence = brand.analysis?.evidence ?? [];
  if (!evidence.length) return "- 출처 분석 필요";
  return evidence
    .map((entry) => `- ${safe(entry.label)}: ${safe(entry.value)} (source=${entry.source}, confidence=${entry.confidence})`)
    .join("\n");
}

function decisionLines(brand: BrandConfig): string {
  const decisions = brand.analysis?.decisions;
  if (!decisions) return "- 분석 결정 없음";
  return [
    `- Primary color: ${decisions.primaryColor.value} — ${safe(decisions.primaryColor.reason)}`,
    `- Accent color: ${decisions.accentColor.value} — ${safe(decisions.accentColor.reason)}`,
    `- Background color: ${decisions.backgroundColor.value} — ${safe(decisions.backgroundColor.reason)}`,
    `- Heading font: ${safe(decisions.headingFont.value)} — ${safe(decisions.headingFont.reason)}`,
    `- Body font: ${safe(decisions.bodyFont.value)} — ${safe(decisions.bodyFont.reason)}`,
  ].join("\n");
}

function list(items: string[] | undefined): string {
  const safeItems = sanitizeToolBrandReferenceList(items);
  return safeItems.length ? safeItems.map((item) => `- ${item}`).join("\n") : "- 기준 필요";
}

function formatInlineList(items: string[]): string {
  return items.length ? sanitizeToolBrandReferenceList(items).join(", ") : "미정";
}

function safe(text: string): string {
  return sanitizeToolBrandReferences(text);
}
