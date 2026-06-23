// Builds the system prompt that makes Claude read a user's brand documents
// (brand.md / design.md / tokens.css, etc.) and extract a structured brand
// profile, then PUT it to /api/brand. Markdown prose is unreliable to parse
// by regex, so we let Claude do the extraction and write the result back via
// the existing brand API (same curl pattern as the rest of the app).
export function buildBrandImportPrompt(docs: string): string {
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
  keywords(자주 쓰는 단어 배열).
- name: 브랜드 이름.

## 적용 — 추출한 JSON으로 brand API에 PUT (Bash curl)
\`\`\`bash
curl -s -X PUT http://localhost:3000/api/brand \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "...",
    "colors": {"primary":"#...","secondary":"#...","accent":"#...","background":"#...","surface":"#...","line":"#...","dark":"#...","accentDark":"#...","eucalyptus":"#...","dusty":"#...","soot":"#..."},
    "fonts": {"heading":"...","body":"...","mono":"..."},
    "styleKeywords": ["..."],
    "voice": {"ending":"...","banned":["..."],"keywords":["..."]}
  }'
\`\`\`
없는 색 키는 객체에서 빼도 됩니다. PUT을 한 번만 하고 멈추세요.

## 브랜드 문서
${docs}`;
}
