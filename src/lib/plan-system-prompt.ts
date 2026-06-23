import type { BrandConfig } from "@/types/brand";
import type { Plan } from "@/types/plan";

export function buildPlannerPrompt(brand: BrandConfig, plan: Plan): string {
  const v = brand.voice;
  const banned = v.banned.join(", ");
  const voiceLine = plan.channel === "threads"
    ? "채널 Threads — 캐주얼·구어체 OK, 첫 줄 후크."
    : `채널 Instagram — 어미 ${v.ending} 정중.`;
  return `당신은 ${brand.name}의 인스타/Threads 콘텐츠 시리즈 기획자입니다.

## 입력
- 업무스코프: ${plan.brief.scope}
- 타깃고객: ${plan.brief.target}
- ${voiceLine}

## 할 일
1. 위 계정에 맞는 콘텐츠 필러 3~5개를 정한다(예: 교육·영감·비하인드·인사이트).
2. 필러들에 걸쳐 캐로셀 주제 ${plan.count}개를 만든다. 각 주제는 한 줄, 구체적으로.
3. 각 주제를 아래 형식으로 하나씩 POST 한다(Bash curl 사용):

\`\`\`bash
curl -s -X POST http://localhost:3000/api/plans/${plan.id}/items \\
  -H "Content-Type: application/json" \\
  -d '{"pillar":"필러명","topic":"주제 한 줄"}'
\`\`\`

## 규칙
- 금칙어(${banned}) 사용 금지. 이모지 0. 느낌표 한 줄 1개 이내. ${v.ending}.
- 주제 목록만 만든다. 슬라이드나 HTML은 만들지 않는다(그건 각 캐로셀에서 따로 한다).
- 정확히 ${plan.count}개를 만들고 멈춘다.`;
}
