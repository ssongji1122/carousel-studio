// Pulls a brand profile from a public Instagram account and turns it into the
// same kind of brand document that /api/brand/import already understands, so
// the existing Claude-extraction pipeline can map it to brand.json.
//
// NOTE: This calls Instagram's unofficial public web_profile_info endpoint
// (the same one the website uses for logged-out profile views). It is not an
// official API — Instagram can rate-limit or block it, and it may break without
// notice. On any failure we surface a clear error and the user falls back to
// the manual "문서에서 가져오기" path. Only public profiles are reachable.

import sharp from "sharp";

const IG_APP_ID = "936619743392459";
const IG_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// Node's undici fetch trips Instagram's WAF ("SecFetch Policy violation")
// unless these Sec-Fetch-* hints are sent explicitly — curl passes because it
// sends none and undici sends a mismatched set. Spelling them out clears it.
const IG_HEADERS: Record<string, string> = {
  "x-ig-app-id": IG_APP_ID,
  "User-Agent": IG_UA,
  Accept: "*/*",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty",
};

export interface IgProfile {
  username: string;
  fullName: string;
  biography: string;
  category: string | null;
  followers: number;
  externalUrl: string | null;
  bioLinks: { title: string; url: string }[];
  profilePicUrl: string | null;
  posts: { caption: string; imageUrl: string | null }[];
}

/** Normalize "@Handle", "instagram.com/handle", "handle/" → "handle". */
export function normalizeHandle(input: string): string {
  let h = input.trim();
  const urlMatch = h.match(/instagram\.com\/([^/?#]+)/i);
  if (urlMatch) h = urlMatch[1];
  h = h.replace(/^@/, "").replace(/\/+$/, "").trim();
  return h;
}

/** Parse the web_profile_info JSON payload into a compact IgProfile. Pure. */
export function parseProfileJson(json: unknown): IgProfile {
  const u = (json as { data?: { user?: Record<string, unknown> } })?.data?.user;
  if (!u) throw new Error("프로필 데이터를 찾지 못했습니다.");
  const g = <T>(k: string, fallback: T): T => (u[k] as T) ?? fallback;

  const edges =
    (u.edge_owner_to_timeline_media as { edges?: { node: Record<string, unknown> }[] })
      ?.edges ?? [];
  const posts = edges.slice(0, 9).map((e) => {
    const n = e.node;
    const capEdges =
      (n.edge_media_to_caption as { edges?: { node: { text: string } }[] })?.edges ?? [];
    return {
      caption: capEdges[0]?.node?.text ?? "",
      imageUrl: (n.display_url as string) ?? null,
    };
  });

  const bioLinks = (g<{ title?: string; url?: string }[]>("bio_links", []) || []).map((b) => ({
    title: b.title ?? "",
    url: b.url ?? "",
  }));

  return {
    username: g("username", ""),
    fullName: g("full_name", ""),
    biography: g("biography", ""),
    category: g<string | null>("category_name", null),
    followers: (u.edge_followed_by as { count?: number })?.count ?? 0,
    externalUrl: g<string | null>("external_url", null),
    bioLinks,
    profilePicUrl: g<string | null>("profile_pic_url_hd", g<string | null>("profile_pic_url", null)),
    posts,
  };
}

/** Fetch a public profile. Throws on network/HTTP/parse failure. */
export async function fetchInstagramProfile(handle: string): Promise<IgProfile> {
  const username = normalizeHandle(handle);
  if (!username || !/^[A-Za-z0-9._]{1,30}$/.test(username)) {
    throw new Error("올바른 인스타그램 핸들이 아닙니다.");
  }
  const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(
    username
  )}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: IG_HEADERS,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`인스타그램 응답 오류 (HTTP ${res.status}) — 비공개 계정이거나 일시 차단일 수 있습니다.`);
    }
    return parseProfileJson(await res.json());
  } finally {
    clearTimeout(timer);
  }
}

type Bucket = { n: number; r: number; g: number; b: number };

/** Accumulate a raw RGB(A) buffer into a shared bucket map. `bits` per channel. */
function accumulateBuckets(
  raw: Uint8Array | Buffer,
  channels: number,
  map: Map<number, Bucket>,
  bits = 4
): void {
  const shift = 8 - bits;
  for (let i = 0; i + channels - 1 < raw.length; i += channels) {
    const r = raw[i], g = raw[i + 1], b = raw[i + 2];
    const key = ((r >> shift) << (2 * bits)) | ((g >> shift) << bits) | (b >> shift);
    const acc = map.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    acc.n++; acc.r += r; acc.g += g; acc.b += b;
    map.set(key, acc);
  }
}

/**
 * Pick the top-N most-distinct dominant colors from a bucket map, averaging
 * each bucket's members. Near-duplicate hues are merged so the palette spans
 * the image's range (ink/accent/paper) instead of collapsing to one mid-gray.
 */
function topColors(map: Map<number, Bucket>, maxColors: number): string[] {
  const ranked = Array.from(map.values())
    .sort((a, b) => b.n - a.n)
    .map(({ n, r, g, b }) => ({ r: r / n, g: g / n, b: b / n }));
  const picked: { r: number; g: number; b: number }[] = [];
  for (const c of ranked) {
    if (picked.length >= maxColors) break;
    // keep colors that are not too close (Euclidean) to an already-picked one
    const tooClose = picked.some(
      (p) => Math.abs(p.r - c.r) + Math.abs(p.g - c.g) + Math.abs(p.b - c.b) < 48
    );
    if (!tooClose) picked.push(c);
  }
  const to = (x: number) => Math.round(x).toString(16).padStart(2, "0");
  return picked.map((c) => `#${to(c.r)}${to(c.g)}${to(c.b)}`.toUpperCase());
}

/** Quantize a single raw RGB buffer into top-N dominant colors. Pure. */
export function dominantColorsFromRaw(
  raw: Uint8Array | Buffer,
  channels: number,
  maxColors = 6
): string[] {
  const map = new Map<number, Bucket>();
  accumulateBuckets(raw, channels, map);
  return topColors(map, maxColors);
}

/**
 * Download images and extract a merged dominant palette via sharp. All images'
 * pixels accumulate into one bucket map so a brand's recurring colors win,
 * then distinct top colors are returned (ink, accent, paper).
 */
export async function extractPalette(imageUrls: string[], maxColors = 6): Promise<string[]> {
  const map = new Map<number, Bucket>();
  const urls = imageUrls.filter(Boolean).slice(0, 6);
  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { headers: IG_HEADERS });
        if (!res.ok) return;
        const buf = Buffer.from(await res.arrayBuffer());
        const { data, info } = await sharp(buf)
          .resize(100, 100, { fit: "cover" })
          .raw()
          .toBuffer({ resolveWithObject: true });
        accumulateBuckets(data, info.channels, map);
      } catch {
        // skip unreadable image
      }
    })
  );
  return topColors(map, maxColors);
}

/**
 * Build the brand document the import prompt consumes. We hand Claude the raw
 * palette + bio + recent series captions and let it map colors→tokens, infer
 * fonts from mood, and assemble voice — the same judgment a human applies.
 * Pure.
 */
export function buildInstagramBrandDoc(profile: IgProfile, palette: string[]): string {
  const series = profile.posts
    .map((p) => p.caption.replace(/\s+/g, " ").trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 8);
  const mood = [profile.category, ...profile.bioLinks.map((b) => b.title)]
    .filter(Boolean)
    .join(" · ");

  return `# ${profile.fullName || profile.username} — 브랜드 문서 (Instagram 추출)

> 출처: Instagram @${profile.username} (web_profile_info) + 피드 이미지 도미넌트 컬러.

## 정체성
- 이름: ${profile.fullName || profile.username}
- 카테고리: ${profile.category ?? "미상"} (팔로워 ${profile.followers})
- 바이오: ${profile.biography.replace(/\n/g, " / ") || "없음"}
- 외부 링크: ${profile.externalUrl ?? "없음"}
- 무드 단서: ${mood || "없음"}

## 색 (피드 도미넌트 컬러 — 가장 빈도 높은 순)
${palette.length ? palette.map((h) => `- ${h}`).join("\n") : "- (추출 실패)"}

이 팔레트의 HEX만 사용하세요. 목록에 없는 색을 새로 발명하거나 다른 브랜드 값을 가져오지 마세요.
- background = 가장 밝은 값, primary = 가장 어두운 값, accent = 가장 채도 있는(무채색이 아닌) 값.
- **colors 객체의 11개 키(primary·secondary·accent·background·surface·line·dark·accentDark·eucalyptus·dusty·soot)를 빠짐없이 모두 채우세요.** 마땅한 값이 없는 보조 키는 위 팔레트 안에서 가장 가까운 값을 복제해 넣으세요. 키를 비우면 이전 브랜드의 색이 남으니 절대 생략하지 마세요.

## 폰트
공식 지정 서체 단서는 없습니다. 위 카테고리·무드에서 유추하세요. 한국어 본문이 많으면 body는 Pretendard, 세리프 무드면 heading에 세리프(한글은 Nanum Myeongjo 폴백)를 권장.

## 시리즈·콘텐츠 단서 (보이스·키워드 추정용)
${series.length ? series.map((s) => `- ${s}`).join("\n") : "- 없음"}

## 보이스
- 어미: 합니다체 (정중)
- 피할 단어: 혁신적, 혁신, 융합, 솔루션, 시너지, 패러다임, 선도, 최고의, 차세대, 임팩트, 스케일, 피벗`;
}

/** End-to-end: handle → profile + palette → brand document string. */
export async function buildBrandDocFromInstagram(handle: string): Promise<string> {
  const profile = await fetchInstagramProfile(handle);
  const images = [
    ...profile.posts.map((p) => p.imageUrl).filter((u): u is string => !!u),
    ...(profile.profilePicUrl ? [profile.profilePicUrl] : []),
  ];
  const palette = await extractPalette(images);
  return buildInstagramBrandDoc(profile, palette);
}
