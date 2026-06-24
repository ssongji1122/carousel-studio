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

type RGB = { r: number; g: number; b: number };
const rgbSaturation = (c: RGB) => {
  const mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b);
  return mx === 0 ? 0 : (mx - mn) / mx;
};
const tooClose = (picked: RGB[], c: RGB) =>
  picked.some((p) => Math.abs(p.r - c.r) + Math.abs(p.g - c.g) + Math.abs(p.b - c.b) < 48);

/**
 * Pick the most representative colors from a bucket map. We take the dominant
 * colors by area (paper/ink) AND the most saturated colors (the brand accent),
 * because a brand's signature color is often a small-area pop (a pink garment
 * on a neutral lookbook) that pure frequency would drop. Distinct only.
 */
function topColors(map: Map<number, Bucket>, maxColors: number): string[] {
  const items = Array.from(map.values()).map(({ n, r, g, b }) => ({
    n, r: r / n, g: g / n, b: b / n,
  }));
  const byArea = [...items].sort((a, b) => b.n - a.n);
  const bySat = items
    .filter((c) => rgbSaturation(c) > 0.2)
    .sort((a, b) => rgbSaturation(b) - rgbSaturation(a));

  const picked: RGB[] = [];
  // ~60% area-dominant (background, ink), then fill with saturated accents.
  const areaQuota = Math.max(1, Math.ceil(maxColors * 0.6));
  for (const c of byArea) {
    if (picked.length >= areaQuota) break;
    if (!tooClose(picked, c)) picked.push(c);
  }
  for (const c of bySat) {
    if (picked.length >= maxColors) break;
    if (!tooClose(picked, c)) picked.push(c);
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

/** All representative image URLs for palette extraction (posts + profile pic). */
export function profileImageUrls(profile: IgProfile): string[] {
  return [
    ...profile.posts.map((p) => p.imageUrl).filter((u): u is string => !!u),
    ...(profile.profilePicUrl ? [profile.profilePicUrl] : []),
  ];
}
