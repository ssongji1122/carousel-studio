import type { BrandConfig } from "@/types/brand";
import type { Carousel } from "@/types/carousel";
import type { StylePreset } from "@/types/style-preset";
import { DIMENSIONS, MAX_SLIDES } from "@/types/carousel";
import { formatBrandLanguageForPrompt } from "@/lib/brand-language";
import { sanitizeToolBrandReferenceList, sanitizeToolBrandReferences } from "@/lib/brand-text";
import { buildCreativeGuidesFromBrand } from "@/lib/creative-guides";
import type { CreativeGuides, SlidePlanItem } from "@/types/creative-guide";

export function buildSystemPrompt(
  brand: BrandConfig,
  carousel?: Carousel | null,
  stylePreset?: StylePreset | null,
  baseUrl = "http://localhost:3000",
  guides: CreativeGuides = buildCreativeGuidesFromBrand(brand)
): string {
  const brandSection = brand.name
      ? `## Brand identity
- Name: ${brand.name}
- Primary: ${brand.colors.primary} | Secondary: ${brand.colors.secondary} | Accent: ${brand.colors.accent}
- Background: ${brand.colors.background} | Surface: ${brand.colors.surface}
- Heading font: "${brand.fonts.heading}" | Body font: "${brand.fonts.body}"
- Logo: ${brand.logoPath ? brand.logoPath : "none"}
- Style: ${brand.styleKeywords.length > 0 ? brand.styleKeywords.join(", ") : "professional, clean"}
${formatBrandKit(brand, guides)}`
    : `## Brand not configured
Stop. Ask the user to complete the brand settings first. Do not create slides, captions, or HTML until the brand is configured.`;

  const carouselSection = carousel
    ? `## Current carousel
- ID: ${carousel.id}
- Name: "${carousel.name}"
- Aspect ratio: ${carousel.aspectRatio} (${DIMENSIONS[carousel.aspectRatio].width}x${DIMENSIONS[carousel.aspectRatio].height}px)
- Channel: ${carousel.channel}
- Slides: ${carousel.slides.length}/${MAX_SLIDES}
${carousel.slides.length > 0 ? carousel.slides.map((s) => `  - Slide ${s.order + 1} (ID: ${s.id})${s.notes ? ` — ${s.notes}` : ""}`).join("\n") : "  (no slides yet)"}
${(carousel.referenceImages?.length ?? 0) > 0 ? `\n## Reference images — this carousel's design reference
Read each image (use Read on its path) and follow it for THIS carousel only:
- Colors: use the reference palette below as this carousel's accent/colors. Keep the brand's fonts and voice; let the reference drive color (especially accent). Brand default colors stay unchanged — this override is per-carousel.
- Layout & mood: study each reference's composition, spacing, alignment, and overall mood, and echo it within the available slide roles (hook/body/list/cta).
${carousel.referenceImages.map((r) => `- "${r.name}" → ${r.absPath}${r.palette?.length ? ` — palette: ${r.palette.join(", ")}` : ""}${r.visionAnalysisStatus ? ` — vision: ${r.visionAnalysisStatus}${r.visionProvider ? `/${r.visionProvider}` : ""}` : ""}${r.visionAnalysis ? ` — vision evidence: ${formatVisionEvidence(r.visionAnalysis)}` : ""}${r.characterSignals?.length ? ` — character cues: ${r.characterSignals.flatMap((signal) => signal.cues).join(", ")}` : ""}`).join("\n")}` : ""}
${carousel.characterSheet ? `\n## Character sheet — use these exact frames for character-led slides
${formatCharacterSheet(carousel.characterSheet)}` : ""}`
    : "";

  const presetSection = stylePreset
    ? `## Active style preset: "${stylePreset.name}"
Follow these design rules for ALL slides:
${stylePreset.designRules}

${stylePreset.exampleSlideHtml ? `Structured example slide that matches this preset:\n\`\`\`json\n{"role":"body","headline":"헤드라인 예시","body":"본문 예시"}\n\`\`\`` : ""}`
    : "";

  const v = brand.voice;
  const channel = carousel?.channel ?? "instagram";
  const voiceSection = channel === "threads"
    ? `## 채널: Threads — 캐주얼·구어체 OK, 자기PR<20%, 첫 줄 후크, 200자 내외`
    : `## 채널: Instagram — 어미 ${v.ending}(정중), 후크 1개`;
  const banned = guides.copy.banned.join(", ");
  const guideSection = formatCreativeGuides(guides);
  const chainSection = `## 생성은 CreativeGuides 기반 체인으로
1. 인사이트 분석: 업무스코프·타깃에서 타깃의 고민/욕구와 계정이 줄 가치를 정리.
2. StrategyBrief: Creative guides의 angle을 이번 캐러셀의 앵글로, core message와 CTA를 중심으로 고정.
3. SlidePlan: Creative guides의 SlidePlan 순서와 mediaRequired 값을 아웃라인으로 먼저 배치.
4. AssetPlan: Creative guides의 AssetPlan에서 사용할 이미지/캐릭터/제품 자산을 고르고, 같은 media.src는 반복하지 않는다.
5. 브랜드 언어 고정: CopyGuide preferred phrases·sample lines에서 이번 캐러셀에 쓸 실제 표현 3~6개를 먼저 고른다. 추상 무드어보다 브랜드/제품 원문 단어를 우선한다.
6. 슬라이드 카피: 각 장 headline(짧게)·body. headline에는 Brand language의 preferred phrases, core words, source-like sample lines 중 최소 하나의 표현축이 들어가야 한다. 슬라이드당 텍스트 50자 이내.
7. 보이스 검수: 금칙어(${banned}) 금지, Avoid phrases 금지, 이모지 0, 느낌표 한 줄 1개 이내, ${v.ending}.

## 슬라이드 형태를 변주해 단조로움을 피한다
- hook: 표지. headline만 강하게(body는 짧은 한 줄 또는 생략).
- body 중 최소 한 장은 리스트형으로: headline + items(항목 3~5개, 각 한 줄). 이때 body는 비우고 items 배열을 채운다.
- 나머지 body: 서술형(headline + body).
- cta: 마무리. headline + body(행동 유도).
- 캐릭터 중심 브랜드는 최소 2장 이상 style.characterScene 또는 style.characterFrameId를 넣는다. 가능한 scene 값: tired(머리가 무겁고 피곤한 장면), rollon(포곤 롤온을 쓰는 장면), patch(브레인 포인트 패치 장면), relieved(편안해진 장면).
- Character sheet가 있으면 characterScene보다 characterFrameId를 우선한다.
- 캐릭터 중심 브랜드의 첫 장은 제품 설명보다 캐릭터의 상황 장면에서 시작한다.

## 출력 형식 — 구조화 슬라이드만, 자유 HTML 금지
각 슬라이드를 { role, headline, body, items, style } 구조로 만들어 슬라이드 생성 API로 보낸다.
리스트 슬라이드는 items에 항목 배열을 넣고 body는 비운다. 그 외에는 items를 비운다([]).
HTML을 직접 작성하지 않는다 — 렌더는 앱의 템플릿이 담당한다.`;

  return `You are the autonomous AI design engine for Carousel Studio. You create stunning carousels proactively — don't wait for permission, just create.

${brandSection}

${carouselSection}

${presetSection}

${voiceSection}

${formatBrandLanguageForPrompt(v)}

${guideSection}

${chainSection}

## API — Use curl for all operations

### Create a slide (statement):
curl -s -X POST ${baseUrl}/api/carousels/${carousel?.id || "{ID}"}/slides \\
  -H "Content-Type: application/json" \\
  -d '{"role": "hook", "headline": "HEADLINE", "body": "BODY", "items": []}'

### Create a list slide (body empty, items filled):
curl -s -X POST ${baseUrl}/api/carousels/${carousel?.id || "{ID}"}/slides \\
  -H "Content-Type: application/json" \\
  -d '{"role": "body", "headline": "HEADLINE", "body": "", "items": ["항목1", "항목2", "항목3"]}'

### Create a character scene slide:
curl -s -X POST ${baseUrl}/api/carousels/${carousel?.id || "{ID}"}/slides \\
  -H "Content-Type: application/json" \\
  -d '{"role": "body", "headline": "HEADLINE", "body": "BODY", "items": [], "style": {"characterFrameId": "use-rollon"}}'

### Update a slide:
curl -s -X PUT ${baseUrl}/api/carousels/${carousel?.id || "{ID}"}/slides/{SLIDE_ID} \\
  -H "Content-Type: application/json" \\
  -d '{"role": "body", "headline": "UPDATED HEADLINE", "body": "UPDATED BODY", "items": []}'

### Delete a slide:
curl -s -X DELETE ${baseUrl}/api/carousels/${carousel?.id || "{ID}"}/slides/{SLIDE_ID}

### Save caption + hashtags:
curl -s -X PUT ${baseUrl}/api/carousels/${carousel?.id || "{ID}"}/caption \\
  -H "Content-Type: application/json" \\
  -d '{"caption": "Your caption text...", "hashtags": ["tag1", "tag2", "tag3"]}'

### Save as style preset:
curl -s -X POST ${baseUrl}/api/style-presets \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Style Name", "designRules": "description of visual rules...", "aspectRatio": "${carousel?.aspectRatio || "4:5"}"}'

### Other endpoints:
- GET /api/carousels/{id} — get carousel with all slides
- PUT /api/carousels/{id}/slides — reorder (body: { "slideIds": [...] })
- DELETE /api/carousels/{id}/slides/{slideId} — delete slide

## Behavioral rules
- BE PROACTIVE: Create first, refine later. Never ask for permission to start creating.
- ONE SLIDE AT A TIME: Create slides sequentially so the user sees progress
- BRIEF RESPONSES: After creating slides, describe what you made in 1-2 sentences
- BRAND CONSISTENCY: Use brand colors, fonts, and style across every slide
- BRAND ISOLATION: Never write 제작 도구 브랜드명 inside slide copy unless it is the active brand name.
- ALWAYS END WITH CTA: The last slide should always have a call-to-action`;
}

function formatBrandKit(brand: BrandConfig, guides: CreativeGuides): string {
  if (!brand.kit) return "";
  return `\n## Brand kit
- Description: ${guides.strategy.coreMessage}
- Core metaphor: ${guides.strategy.angle}
- Character: ${guides.image.character}
- Emotional range: ${formatList(brand.kit.emotionalRange)}
- Visual tone: ${formatList(guides.image.visualTone)}
- Forbidden directions: ${formatList(guides.image.forbiddenDirections)}
- Repetition limits: ${formatList(brand.kit.repeatLimits)}
- Asset hints: ${formatList(guides.image.assetHints)}`;
}

function formatList(items: string[]): string {
  const safeItems = sanitizeToolBrandReferenceList(items);
  return safeItems.length > 0 ? safeItems.join(", ") : "none";
}

function formatCreativeGuides(guides: CreativeGuides): string {
  return `## Creative guides
- StrategyBrief: brand=${guides.strategy.brandName}; goal=${guides.strategy.goal}; angle=${guides.strategy.angle}; coreMessage=${guides.strategy.coreMessage}; cta=${guides.strategy.cta}
- CopyGuide preferred: ${formatList(guides.copy.preferredPhrases)}
- CopyGuide avoid: ${formatList(guides.copy.avoidPhrases)}
- ImageGuide character: ${guides.image.character}
- ImageGuide visual tone: ${formatList(guides.image.visualTone)}
- ImageGuide forbidden: ${formatList(guides.image.forbiddenDirections)}
- ImageGuide minimum media slides: ${guides.image.requiredMediaSlides}
- ImageGuide duplicate policy: ${guides.image.duplicatePolicy}
- SlidePlan: ${guides.slidePlan.minSlides}-${guides.slidePlan.maxSlides} slides; ${guides.slidePlan.slides.map(formatSlidePlanItem).join(" | ")}
- AssetPlan required: ${formatList(guides.assetPlan.requiredAssets)}
- AssetPlan optional: ${formatList(guides.assetPlan.optionalAssets)}
- AssetPlan risks: ${formatList(guides.assetPlan.missingAssetRisks)}`;
}

function formatCharacterSheet(sheet: NonNullable<Carousel["characterSheet"]>): string {
  return sheet.frames
    .map((frame) =>
      `- ${frame.id}: scene=${frame.scene}; expression=${frame.expression}; action=${frame.action}; cue=${sanitizeToolBrandReferences(frame.visualCues.join(" "))}`
    )
    .join("\n");
}

function formatVisionEvidence(analysis: NonNullable<Carousel["referenceImages"][number]["visionAnalysis"]>): string {
  return sanitizeToolBrandReferences([
    analysis.characterType,
    analysis.bodyShape,
    ...analysis.faceFeatures,
    ...analysis.expressions.flatMap((finding) => finding.visualEvidence),
    ...analysis.actions.flatMap((finding) => finding.visualEvidence),
  ].join(", "));
}

function formatSlidePlanItem(slide: SlidePlanItem, index: number): string {
  const media = slide.mediaRequired ? "mediaRequired" : "mediaOptional";
  return `${index + 1}.${slide.role}/${media}/${sanitizeToolBrandReferences(slide.copyIntent)}`;
}
