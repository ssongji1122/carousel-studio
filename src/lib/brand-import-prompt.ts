// Builds the system prompt that makes Claude read a user's brand documents
// (brand.md / design.md / tokens.css, etc.) and extract a structured brand
// profile, then PUT it to /api/brand. Markdown prose is unreliable to parse
// by regex, so we let Claude do the extraction and write the result back via
// the existing brand API (same curl pattern as the rest of the app).
export function buildBrandImportPrompt(
  docs: string,
  baseUrl = "http://localhost:3000"
): string {
  return `당신은 브랜드 문서에서 디자인 토큰을 추출하는 도우미입니다.

아래는 사용자의 브랜드 문서(brand.md / design.md / tokens.css 등)입니다. 이 문서에서
색·폰트·보이스 정보를 찾아 brand.json 구조로 정리한 뒤, 아래 API로 PUT 하세요.

## 추출 규칙
- 색: 문서에 적힌 HEX 값을 그대로 사용(추측 금지). 못 찾은 키는 비슷한 키에서 유추하거나 생략.
  - background(기본 배경), surface(보조 배경), primary(본문 텍스트/잉크), secondary(보조 텍스트),
    accent(링크·CTA 강조), line(구분선). 있으면 dark(다크 배경), accentDark(다크용 강조),
    eucalyptus/dusty/soot(보조 팔레트)도.
- 폰트: heading(헤드라인/디스플레이·숫자용), body(본문), mono(라벨·코드). 문서의 폰트명을 그대로.
- 보이스: ending(어미, 예 "합니다체"), banned(금칙어 배열 — 문서의 "쓰지 않는 단어"/"피할 것"),
  keywords(자주 쓰는 단어 배열), language(브랜드 문장 습관).
- language는 브랜드별 말투를 분리하는 핵심 데이터입니다. 실제 문서·웹사이트·인스타 문장에 가까운 표현만 넣으세요.
  - preferredPhrases: 원문에서 반복되거나 브랜드답게 들리는 짧은 구절 5~10개.
  - avoidPhrases: 이 브랜드와 맞지 않는 일반적/다른 브랜드식 표현 5~10개. 특히 source에 없는 추상적인 정리형 문장, studio.soluta식 문장, 과장 표현.
  - headlinePatterns: 헤드라인이 어떤 구조로 시작/끝나는지 3~5개.
  - writingRules: 캐러셀 문안을 쓸 때 지켜야 할 문장 규칙 3~6개.
  - sampleLines: 실제 원문에 가까운 캐러셀 헤드라인 예시 3~6개. 새 브랜드를 섞지 말고 source language만 사용.
- 브랜드 키트: kit.description, kit.metaphor, kit.character, kit.emotionalRange, kit.visualTone,
  kit.forbiddenDirections, kit.repeatLimits, kit.assetHints를 채우세요.
  이미지·캐릭터 단서가 있으면 kit.character를 절대 "전용 캐릭터 미정"으로 두지 않습니다.
  이미지를 직접 볼 수 없다면 kit.character에 "이미지 확인 필요: <핵심 이미지 URL>"처럼 남겨 다음 단계에서 사람이 확인할 수 있게 합니다.
- name: 브랜드 이름.

## 적용 — 추출한 JSON으로 brand API에 PUT (Bash curl)
\`\`\`bash
curl -s -X PUT ${baseUrl}/api/brand \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "...",
    "colors": {"primary":"#...","secondary":"#...","accent":"#...","background":"#...","surface":"#...","line":"#...","dark":"#...","accentDark":"#...","eucalyptus":"#...","dusty":"#...","soot":"#..."},
    "fonts": {"heading":"...","body":"...","mono":"..."},
    "styleKeywords": ["..."],
    "voice": {
      "ending":"...",
      "banned":["..."],
      "keywords":["..."],
      "language":{
        "preferredPhrases":["..."],
        "avoidPhrases":["..."],
        "headlinePatterns":["..."],
        "writingRules":["..."],
        "sampleLines":["..."]
      }
    },
    "kit":{
      "description":"...",
      "metaphor":"...",
      "character":"...",
      "emotionalRange":["..."],
      "visualTone":["..."],
      "forbiddenDirections":["..."],
      "repeatLimits":["..."],
      "assetHints":["..."]
    }
  }'
\`\`\`
없는 색 키는 객체에서 빼도 됩니다. PUT을 한 번만 하고 멈추세요.

## 브랜드 문서
${docs}`;
}
