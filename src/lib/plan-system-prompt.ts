import type { BrandConfig } from "@/types/brand";
import type { Plan } from "@/types/plan";
import { formatBrandLanguageForPrompt } from "@/lib/brand-language";
import { sanitizeToolBrandReferenceList, sanitizeToolBrandReferences } from "@/lib/brand-text";
import { buildCreativeGuidesFromBrand } from "@/lib/creative-guides";
import type { CreativeGuides } from "@/types/creative-guide";

export function buildPlannerPrompt(
  brand: BrandConfig,
  plan: Plan,
  baseUrl = "http://localhost:3000",
  guides: CreativeGuides = buildCreativeGuidesFromBrand(brand)
): string {
  const v = brand.voice;
  const banned = guides.copy.banned.join(", ");
  const voiceLine = plan.channel === "threads"
    ? "채널 Threads — 캐주얼·구어체 OK, 첫 줄 후크."
    : `채널 Instagram — 어미 ${v.ending} 정중.`;
  const brandName = brand.name.trim();
  if (!brandName) {
    return `브랜드 설정이 필요합니다.

슬라이드나 주제를 만들지 말고, 먼저 브랜드명과 톤앤보이스 설정을 요청합니다.`;
  }

  return `당신은 ${brandName}의 인스타/Threads 콘텐츠 시리즈 기획자입니다.

${formatBrandKit(brand, guides)}

${formatBrandLanguageForPrompt(v)}

${formatCreativeGuides(guides)}

## 입력
- 업무스코프: ${plan.brief.scope}
- 타깃고객: ${plan.brief.target}
- ${voiceLine}

## 할 일
1. StrategyBrief의 angle과 core message를 기준으로 콘텐츠 필러 3~5개를 정한다.
2. CopyGuide의 preferred phrases와 sample lines를 사용해 필러별 캐러셀 주제 ${plan.count}개를 만든다.
3. ImageGuide의 캐릭터/이미지 요구사항이 살아나는 주제를 우선한다. 캐릭터 중심 브랜드면 텍스트 카드만 떠오르는 주제는 피한다.
4. 각 주제를 아래 형식으로 하나씩 POST 한다(Bash curl 사용):

\`\`\`bash
curl -s -X POST ${baseUrl}/api/plans/${plan.id}/items \\
  -H "Content-Type: application/json" \\
  -d '{"pillar":"필러명","topic":"주제 한 줄"}'
\`\`\`

## 규칙
- Brand language의 preferred phrases·sample lines를 우선 사용한다. 제작 도구식 정리 문장으로 바꾸지 않는다.
- 금칙어(${banned})와 Avoid phrases 사용 금지. 이모지 0. 느낌표 한 줄 1개 이내. ${v.ending}.
- 주제 목록만 만든다. 슬라이드나 HTML은 만들지 않는다(그건 각 캐로셀에서 따로 한다).
- 정확히 ${plan.count}개를 만들고 멈춘다.`;
}

function formatBrandKit(brand: BrandConfig, guides: CreativeGuides): string {
  if (!brand.kit) return "";
  return `## 브랜드 키트
- 설명: ${guides.strategy.coreMessage}
- 핵심 메타포: ${guides.strategy.angle}
- 캐릭터: ${guides.image.character}
- 감정 범위: ${formatList(brand.kit.emotionalRange)}
- 시각 톤: ${formatList(guides.image.visualTone)}
- 금지 방향: ${formatList(guides.image.forbiddenDirections)}
- 반복 제한: ${formatList(brand.kit.repeatLimits)}
- 자산 힌트: ${formatList(guides.image.assetHints)}`;
}

function formatList(items: string[]): string {
  const safeItems = sanitizeToolBrandReferenceList(items);
  return safeItems.length > 0 ? safeItems.join(", ") : "없음";
}

function formatCreativeGuides(guides: CreativeGuides): string {
  return `## Creative guides
- StrategyBrief: angle=${guides.strategy.angle}; coreMessage=${guides.strategy.coreMessage}; cta=${guides.strategy.cta}
- CopyGuide preferred: ${formatList(guides.copy.preferredPhrases)}
- CopyGuide avoid: ${formatList(guides.copy.avoidPhrases)}
- ImageGuide character: ${sanitizeToolBrandReferences(guides.image.character)}
- ImageGuide minimum media slides: ${guides.image.requiredMediaSlides}
- ImageGuide duplicate policy: ${guides.image.duplicatePolicy}
- AssetPlan required: ${formatList(guides.assetPlan.requiredAssets)}
- AssetPlan risks: ${formatList(guides.assetPlan.missingAssetRisks)}`;
}
