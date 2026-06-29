import type {
  ExternalSkillpack,
  SkillpackStage,
} from "@/types/external-skillpack";

export const EXTERNAL_SKILLPACKS: readonly ExternalSkillpack[] = [
  {
    id: "dembrandt",
    name: "Dembrandt",
    repo: "dembrandt/dembrandt",
    url: "https://github.com/dembrandt/dembrandt",
    license: "MIT",
    stage: "brand-analysis",
    integrationMode: "adapter",
    risk: "medium",
    enabledByDefault: true,
    targetModule: "design-token-extractor",
    notes: "웹사이트의 로고, 컬러, 타이포, radius, border 토큰 추출 후보",
  },
  {
    id: "dembrandt-skills",
    name: "Dembrandt Skills",
    repo: "dembrandt/dembrandt-skills",
    url: "https://github.com/dembrandt/dembrandt-skills",
    license: "MIT",
    stage: "image-guide",
    integrationMode: "local-guidance",
    risk: "low",
    enabledByDefault: true,
    targetModule: "visual-guidance-compiler",
    notes: "브랜드 비주얼 언어, 타이포, 위계, 컬러 판단 가이드",
  },
  {
    id: "marketingskills",
    name: "Marketing Skills",
    repo: "coreyhaines31/marketingskills",
    url: "https://github.com/coreyhaines31/marketingskills",
    license: "MIT",
    stage: "strategy-brief",
    integrationMode: "local-guidance",
    risk: "low",
    enabledByDefault: true,
    targetModule: "marketing-guidance-compiler",
    notes: "기획, 카피, 소셜, 오퍼, 광고 크리에이티브 가이드",
  },
  {
    id: "marketingskills-copywriting",
    name: "Marketing Skills Copywriting",
    repo: "coreyhaines31/marketingskills",
    url: "https://github.com/coreyhaines31/marketingskills",
    license: "MIT",
    stage: "copy-guide",
    integrationMode: "local-guidance",
    risk: "low",
    enabledByDefault: true,
    targetModule: "copy-guidance-compiler",
    notes: "브랜드 말투, CTA, 소셜 캐러셀 문장 규칙으로 컴파일할 copywriting/copy-editing 가이드",
  },
  {
    id: "baml",
    name: "BAML",
    repo: "BoundaryML/baml",
    url: "https://github.com/BoundaryML/baml",
    license: "Apache-2.0",
    stage: "structured-output",
    integrationMode: "optional-cli",
    risk: "medium",
    enabledByDefault: false,
    targetModule: "structured-output-validator",
    notes: "SlidePlan, AssetPlan, QualityReport 같은 고위험 구조화 출력 후보",
  },
  {
    id: "promptfoo",
    name: "promptfoo",
    repo: "promptfoo/promptfoo",
    url: "https://github.com/promptfoo/promptfoo",
    license: "MIT",
    stage: "quality-gate",
    integrationMode: "optional-cli",
    risk: "medium",
    enabledByDefault: false,
    targetModule: "prompt-eval-runner",
    notes: "브랜드 혼입, 톤 드리프트, 이미지 누락 회귀 테스트 후보",
  },
  {
    id: "markitdown",
    name: "MarkItDown",
    repo: "microsoft/markitdown",
    url: "https://github.com/microsoft/markitdown",
    license: "MIT",
    stage: "reference-intake",
    integrationMode: "optional-cli",
    risk: "low",
    enabledByDefault: false,
    targetModule: "document-ingest-adapter",
    notes: "브랜드 PDF, deck, 문서 파일을 Markdown으로 변환하는 후보",
  },
  {
    id: "docling",
    name: "Docling",
    repo: "docling-project/docling",
    url: "https://github.com/docling-project/docling",
    license: "MIT",
    stage: "reference-intake",
    integrationMode: "optional-cli",
    risk: "low",
    enabledByDefault: false,
    targetModule: "document-ingest-adapter",
    notes: "PDF, PPTX, DOCX 등 복잡 문서 파싱 후보",
  },
  {
    id: "crawl4ai",
    name: "Crawl4AI",
    repo: "unclecode/crawl4ai",
    url: "https://github.com/unclecode/crawl4ai",
    license: "Apache-2.0",
    stage: "reference-intake",
    integrationMode: "optional-cli",
    risk: "medium",
    enabledByDefault: false,
    targetModule: "web-intake-adapter",
    notes: "깊은 웹사이트 수집이 필요할 때 쓰는 선택형 크롤러 후보",
  },
  {
    id: "firecrawl",
    name: "Firecrawl",
    repo: "firecrawl/firecrawl",
    url: "https://github.com/firecrawl/firecrawl",
    license: "AGPL-3.0",
    stage: "reference-intake",
    integrationMode: "blocked-runtime",
    risk: "high",
    enabledByDefault: false,
    targetModule: "none",
    notes: "AGPL이라 제품 런타임 의존성으로는 막는다. 별도 승인 전 API-only 검토만 가능",
  },
];

export function listExternalSkillpacks(stage?: SkillpackStage): ExternalSkillpack[] {
  return EXTERNAL_SKILLPACKS.filter((pack) => !stage || pack.stage === stage);
}

export function groupSkillpacksByStage(): Record<SkillpackStage, ExternalSkillpack[]> {
  return EXTERNAL_SKILLPACKS.reduce((groups, pack) => {
    groups[pack.stage].push(pack);
    return groups;
  }, emptyStageGroups());
}

export function validateSkillpackRegistry(
  packs: readonly ExternalSkillpack[] = EXTERNAL_SKILLPACKS
): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const pack of packs) {
    if (ids.has(pack.id)) issues.push(`Duplicate skillpack id: ${pack.id}`);
    ids.add(pack.id);
    if (!pack.license.trim()) issues.push(`${pack.id} is missing a license`);
    if (pack.license.toLowerCase().includes("agpl") && pack.enabledByDefault) {
      issues.push(`${pack.id} uses AGPL and cannot be enabled by default`);
    }
    if (pack.integrationMode === "blocked-runtime" && pack.enabledByDefault) {
      issues.push(`${pack.id} is blocked at runtime and cannot be enabled`);
    }
  }
  return issues;
}

function emptyStageGroups(): Record<SkillpackStage, ExternalSkillpack[]> {
  return {
    "reference-intake": [],
    "brand-analysis": [],
    "strategy-brief": [],
    "copy-guide": [],
    "image-guide": [],
    "structured-output": [],
    "quality-gate": [],
  };
}
