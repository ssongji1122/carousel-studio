// Builds the system prompt that turns a few brand questions (no existing brand
// docs) into a full brand: Claude infers colors/fonts/voice from the mood and
// PUTs them to /api/brand, AND writes brand.md / design.md as takeaway docs the
// user can keep and later re-import. The inverse of brand-import-prompt: that
// one reads docs → tokens; this one reads intent → docs + tokens.

export interface BrandBrief {
  name: string;
  business: string;
  target: string;
  mood: string;
  avoid?: string;
}

const DEFAULT_API_BASE_URL = "http://localhost:3000";

export function buildBrandGeneratePrompt(
  brief: BrandBrief,
  genDir: string,
  apiBaseUrl = DEFAULT_API_BASE_URL
): string {
  return `당신은 브랜드 디자인 도우미입니다. 아래 답변만으로 브랜드를 설계하세요(기존 문서 없음).

## 입력
- 이름: ${brief.name}
- 무엇을 하나: ${brief.business}
- 타깃 고객: ${brief.target}
- 분위기/무드: ${brief.mood}
- 피하고 싶은 느낌: ${brief.avoid?.trim() || "특별히 없음"}

## 할 일 (순서대로)

### 1. 추론
분위기·업종·타깃에서 어울리는 색·폰트·보이스를 정합니다.
- 색(11개 키, HEX): background(가장 밝은 면), surface(보조 배경), primary(잉크/본문),
  secondary(보조 텍스트), accent(채도 있는 강조색 — 무드를 가장 잘 드러내는 1색),
  line(구분선), dark(다크 배경), accentDark(다크용 강조), eucalyptus·dusty·soot(보조).
  무드에 맞게 직접 정하세요(걸리=핑크 계열, 럭셔리=딥/모노, 빈티지=웜 등).
- 폰트: heading·body·mono. 세리프 무드면 heading에 세리프(한글은 "Nanum Myeongjo" 폴백 체인),
  산세/모던이면 Pretendard. 한국어 본문이면 body는 "Pretendard".
- 보이스: ending(어미, 예 "합니다체"), keywords(자주 쓸 단어 3~6개), banned(피할 단어 — 입력의
  "피하고 싶은 느낌" 반영 + 과장/AI buzzword).

### 2. 적용 — brand API에 PUT (Bash curl, 한 번만)
\`\`\`bash
curl -s -X PUT ${apiBaseUrl}/api/brand -H "Content-Type: application/json" -d '{
  "name":"...","colors":{"primary":"#...","secondary":"#...","accent":"#...","background":"#...","surface":"#...","line":"#...","dark":"#...","accentDark":"#...","eucalyptus":"#...","dusty":"#...","soot":"#..."},
  "fonts":{"heading":"...","body":"...","mono":"..."},
  "styleKeywords":["..."],
  "voice":{"ending":"...","keywords":["..."],"banned":["..."]}
}'
\`\`\`

### 3. 산출물 — 다음 두 파일을 Write로 작성
- \`${genDir}/brand.md\` — 브랜드 정체성·한 줄 정의·보이스(어미·자주/피할 단어)·톤. 사람이 읽는 문서.
- \`${genDir}/design.md\` — 색 토큰 표(키·HEX·용도)·폰트 표(역할·폰트)·간단한 사용 원칙.

PUT 1회 + 파일 2개 작성 후 멈추세요. 설명은 짧게.`;
}
