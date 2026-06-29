// Assembles a single brand document from any combination of brand sources
// (Instagram profile, website signals) for the /api/brand/import pipeline.
// Claude reads this and maps it to brand.json. Pure.

import type { IgProfile } from "@/lib/instagram-brand";
import type { WebSignals } from "@/lib/website-brand";

export interface BrandSources {
  ig?: { profile: IgProfile; palette: string[] };
  web?: WebSignals;
}

export function buildBrandDoc({ ig, web }: BrandSources): string {
  const name =
    ig?.profile.fullName || ig?.profile.username || web?.ogTitle || web?.title || "브랜드";
  const origin = [
    ig && `Instagram @${ig.profile.username}`,
    web && `웹사이트 ${web.url}`,
  ].filter(Boolean).join(" + ");

  const L: string[] = [];
  L.push(`# ${name} — 브랜드 문서 (자동 추출)`, "");
  L.push(`> 출처: ${origin}`, "");

  // 정체성
  L.push("## 정체성");
  if (ig) {
    L.push(`- 이름: ${ig.profile.fullName || ig.profile.username}`);
    L.push(`- 카테고리: ${ig.profile.category ?? "미상"} (팔로워 ${ig.profile.followers})`);
    L.push(`- 바이오: ${ig.profile.biography.replace(/\n/g, " / ") || "없음"}`);
    if (ig.profile.externalUrl) L.push(`- 외부 링크: ${ig.profile.externalUrl}`);
  }
  if (web) {
    if (web.ogTitle || web.title) L.push(`- 사이트 제목: ${web.ogTitle || web.title}`);
    if (web.description || web.ogDescription)
      L.push(`- 사이트 설명: ${web.description || web.ogDescription}`);
  }
  L.push("");

  // 색
  const igPal = ig?.palette ?? [];
  const ogPal = web?.ogPalette ?? [];
  const cssCol = web?.cssColors ?? [];
  L.push("## 색 (도미넌트 컬러 — 신뢰 순)");
  if (igPal.length) L.push(`- 인스타 피드 팔레트: ${igPal.join(", ")}`);
  if (ogPal.length) L.push(`- 웹 OG 이미지 팔레트: ${ogPal.join(", ")}`);
  if (cssCol.length) L.push(`- 웹 CSS 색 후보(노이즈 가능, 보조): ${cssCol.join(", ")}`);
  if (!igPal.length && !ogPal.length && !cssCol.length) L.push("- (추출 실패)");
  L.push(
    "",
    "피드·OG 팔레트를 우선 신뢰하세요(CSS 후보는 보조 참고). 위 HEX만 사용하고 새 색을 발명하거나 다른 브랜드 값을 가져오지 마세요.",
    "- background = 가장 밝은 값, primary = 가장 어두운 값, accent = 가장 채도 있는(무채색이 아닌) 값.",
    "- **colors 11개 키(primary·secondary·accent·background·surface·line·dark·accentDark·eucalyptus·dusty·soot)를 빠짐없이 모두 채우세요.** 마땅찮은 보조 키는 위 팔레트 내 가장 가까운 값을 복제하세요. 키를 비우면 이전 브랜드 색이 남으니 절대 생략하지 마세요.",
    ""
  );

  // 폰트
  L.push("## 폰트");
  if (web?.fonts.length) {
    L.push(`- 웹사이트가 실제로 사용하는 폰트(신뢰): ${web.fonts.join(", ")}`);
    L.push(
      "heading·body·mono를 위 폰트에서 배정하세요. 한글 본문이 많으면 body는 Pretendard, 세리프 무드면 heading에 세리프(한글 Nanum Myeongjo 폴백)를 권장."
    );
  } else {
    L.push(
      "- 폰트 단서가 없습니다. 카테고리·무드에서 유추하세요(한국어 본문이 많으면 body는 Pretendard)."
    );
  }
  L.push("");

  L.push("## 이미지·캐릭터 단서");
  const imageAssets = web?.imageAssets ?? [];
  if (imageAssets.length) {
    for (const asset of imageAssets.slice(0, 10)) {
      const meta = [
        `source=${asset.source}`,
        asset.alt ? `alt=${asset.alt}` : "",
        asset.title ? `title=${asset.title}` : "",
      ].filter(Boolean).join(" / ");
      L.push(`- ${asset.url}${meta ? ` (${meta})` : ""}`);
    }
    L.push(
      "",
      "위 이미지에 패키지·마스코트·캐릭터가 보이면 kit.character와 kit.assetHints에 반드시 반영하세요.",
      "이미지를 직접 볼 수 없는 실행 환경이면 kit.character를 '전용 캐릭터 미정'으로 두지 말고 '이미지 확인 필요: <핵심 이미지 URL>'로 남기세요."
    );
  } else {
    L.push("- 없음");
  }
  L.push("");

  // 콘텐츠·보이스 단서
  L.push("## 콘텐츠·보이스 단서 (키워드·톤 추정용)");
  const series = (ig?.profile.posts ?? [])
    .map((p) => p.caption.replace(/\s+/g, " ").trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 8);
  for (const s of series) L.push(`- (IG) ${s}`);
  for (const h of (web?.headings ?? []).slice(0, 6)) L.push(`- (웹) ${h}`);
  for (const s of (web?.copySnippets ?? []).slice(0, 10)) L.push(`- (웹 문장) ${s}`);
  if (!series.length && !(web?.headings.length) && !(web?.copySnippets.length)) L.push("- 없음");
  L.push("");

  // 보이스
  L.push("## 보이스");
  L.push("- 어미: 합니다체 (정중)");
  L.push(
    "- 피할 단어: 혁신적, 혁신, 융합, 솔루션, 시너지, 패러다임, 선도, 최고의, 차세대, 임팩트, 스케일, 피벗",
    "- language.preferredPhrases와 sampleLines는 위 IG/웹 원문 표현에서 뽑으세요.",
    "- language.avoidPhrases에는 이 브랜드 소스에 없는 일반적 정리형 문장과 다른 브랜드식 표현을 넣으세요. 예: 기준이 필요합니다, 먼저 세 가지를 봅니다, 자극보다 정돈, 작은 루틴으로 전환, 흐린 날의 기준, 저장합니다."
  );

  return L.join("\n");
}
