// Analyzes a brand's website for design signals — the real fonts it loads, the
// colors in its theme CSS, the OG image palette, and the page copy — to round
// out (or correct) what an Instagram feed alone can infer. Especially useful
// for fonts: a site declares exactly what it uses, while a feed only hints.
//
// Site builders (WordPress/Gutenberg, etc.) inject their own default palettes
// and system font stacks as noise, so we filter both out before handing the
// candidates to Claude.

import { extractPalette, type IgProfile } from "@/lib/instagram-brand";

const WEB_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// System / generic font names that carry no brand identity.
const SYSTEM_FONTS = new Set(
  [
    "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui",
    "ui-monospace", "-apple-system", "blinkmacsystemfont", "helvetica",
    "helvetica neue", "arial", "tahoma", "verdana", "georgia", "times",
    "times new roman", "courier", "courier new", "monaco", "consolas",
    "menlo", "andale mono", "dejavu sans mono", "pingfang tc", "pingfang sc",
    "sthei", "stheititc-light", "segoe ui", "roboto", "noto sans",
    "sukhumvit set", "inherit", "initial", "unset", "apple sd gothic neo",
    "malgun gothic", "dotum", "gulim", "batang",
  ].map((s) => s.toLowerCase())
);

// WordPress/Gutenberg default palette + common admin chrome colors (noise).
const NOISE_COLORS = new Set(
  [
    "#FF6900", "#FCB900", "#7BDCB5", "#00D084", "#8ED1FC", "#0693E3",
    "#9B51E0", "#F78DA7", "#CF2E2E", "#EB144C", "#ABB8C3", "#21759B",
    "#0085BA", "#767676", "#FAFAFA", "#F1F1F1", "#FFFFFF", "#000000",
  ].map((s) => s.toUpperCase())
);

export interface WebSignals {
  url: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string | null;
  headings: string[];
  fonts: string[];
  cssColors: string[];
  ogPalette: string[];
}

const metaContent = (html: string, re: RegExp): string => {
  const m = html.match(re);
  return m ? m[1].trim() : "";
};

/** Parse the meta/OG fields and headings from a page's HTML. Pure. */
export function parseHtmlMeta(html: string): Omit<WebSignals, "url" | "fonts" | "cssColors" | "ogPalette"> {
  const title = metaContent(html, /<title[^>]*>([^<]*)<\/title>/i);
  const description = metaContent(html, /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || metaContent(html, /<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const ogTitle = metaContent(html, /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
  const ogDescription = metaContent(html, /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
  const ogImageUrl =
    metaContent(html, /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i)
    || metaContent(html, /<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i)
    || null;
  const headings = Array.from(html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi))
    .map((m) => m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 8);
  return { title, description, ogTitle, ogDescription, ogImageUrl, headings };
}

/** Extract non-system font names from CSS/HTML text. Pure. */
export function extractBrandFonts(text: string): string[] {
  const found = new Map<string, number>();
  // Google Fonts: family=Name+Two|family=...
  for (const m of text.matchAll(/family=([^&":;]+)/gi)) {
    const name = decodeURIComponent(m[1].replace(/\+/g, " ").replace(/:.*$/, "")).trim();
    if (name && !SYSTEM_FONTS.has(name.toLowerCase())) found.set(name, (found.get(name) ?? 0) + 3);
  }
  // font-family declarations: take the first (primary) family in each chain
  for (const m of text.matchAll(/font-family:\s*([^;}\n]+)/gi)) {
    const first = m[1].split(",")[0].trim().replace(/['"]/g, "");
    if (first && !SYSTEM_FONTS.has(first.toLowerCase()) && !/^var\(/.test(first)) {
      found.set(first, (found.get(first) ?? 0) + 1);
    }
  }
  return Array.from(found.entries()).sort((a, b) => b[1] - a[1]).map(([n]) => n).slice(0, 4);
}

/** Normalize a CSS color token (#abc, #aabbcc, rgb(...)) to #RRGGBB, or null. */
function normalizeHex(token: string): string | null {
  const t = token.trim();
  let m = t.match(/^#([0-9a-fA-F]{3})$/);
  if (m) {
    const [r, g, b] = m[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  m = t.match(/^#([0-9a-fA-F]{6})$/);
  if (m) return `#${m[1]}`.toUpperCase();
  m = t.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    const h = (n: string) => Math.min(255, parseInt(n, 10)).toString(16).padStart(2, "0");
    return `#${h(m[1])}${h(m[2])}${h(m[3])}`.toUpperCase();
  }
  return null;
}

/**
 * Extract the colors a brand *explicitly declared* — CSS custom properties
 * (:root { --brand: #... }) and the theme-color meta — NOT every hex on the
 * page. Scraping all hex pulls in platform chrome (sale-badge red, button
 * hovers, plugin defaults) that drowns the real brand color; declared tokens
 * are the brand's own choices. The brand's working palette comes from images
 * (logo/OG/feed); this only adds colors the brand named for itself. Pure.
 */
export function extractBrandColors(text: string): string[] {
  const out = new Set<string>();
  // CSS custom properties whose name hints at a brand/theme color.
  for (const m of text.matchAll(
    /--[\w-]*(?:color|brand|primary|accent|point|main|theme|bg|background|sub)[\w-]*:\s*(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\))/gi
  )) {
    const hex = normalizeHex(m[1]);
    if (hex && !NOISE_COLORS.has(hex)) out.add(hex);
  }
  // theme-color meta (the brand's declared chrome color).
  for (const m of text.matchAll(
    /theme-color["'][^>]*content=["'](#[0-9a-fA-F]{3,6}|rgba?\([^)]+\))/gi
  )) {
    const hex = normalizeHex(m[1]);
    if (hex && !NOISE_COLORS.has(hex)) out.add(hex);
  }
  return Array.from(out).slice(0, 8);
}

async function fetchText(url: string, timeoutMs = 12000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": WEB_UA }, signal: controller.signal });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Pick same-origin stylesheet hrefs, prioritizing theme/font CSS over plugins. */
export function selectStylesheets(html: string, baseUrl: string, max = 3): string[] {
  const origin = (() => { try { return new URL(baseUrl).origin; } catch { return ""; } })();
  const hrefs: string[] = [];
  for (const m of html.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi)) {
    const h = m[0].match(/href=["']([^"']+)["']/i)?.[1];
    if (!h) continue;
    let abs: string;
    try { abs = new URL(h, baseUrl).href; } catch { continue; }
    if (origin && !abs.startsWith(origin) && !/fonts\.googleapis\.com/.test(abs)) continue;
    hrefs.push(abs);
  }
  // theme/font stylesheets first — they carry brand type and color
  const score = (u: string) => (/theme|font/i.test(u) ? 0 : 1);
  return hrefs.sort((a, b) => score(a) - score(b)).slice(0, max);
}

// Link aggregators (link-in-bio services) that hide the real homepage behind
// a JS page. We unwrap the most common Korean/global ones.
const AGGREGATORS = /litt\.ly|linktr\.ee|lit\.link|taplink|link\.bio|bio\.link|linkby|campsite\.bio/i;

// URLs that are never a brand's own website (social, chat, marketplaces).
const JUNK_HOSTS =
  /instagram\.com|facebook\.com|fb\.com|youtube|youtu\.be|tiktok|threads\.net|pf\.kakao|kakao\.com|open\.kakao|t\.me|twitter\.com|x\.com|naver\.me|blog\.naver|cafe\.naver/i;
const MARKETPLACES =
  /smartstore\.naver|shopping\.naver|m\.shopping|brand\.naver|coupang|11st|gmarket|auction\.|museumshop|ohou\.se|idus\.com|wadiz|aliexpress|taobao/i;

/** Unwrap an l.instagram.com / l.facebook.com redirect to its real target. */
export function unwrapInstagramUrl(url: string): string {
  try {
    const u = new URL(url);
    if (/l\.instagram\.com|l\.facebook\.com|lm\.facebook\.com/.test(u.hostname)) {
      const target = u.searchParams.get("u");
      if (target) return decodeURIComponent(target);
    }
  } catch {
    /* not a URL */
  }
  return url;
}

export function isAggregator(url: string): boolean {
  return AGGREGATORS.test(url);
}

/** Extract outbound links from a litt.ly page (base64 JSON in #data). Pure. */
export function parseLittlyLinks(html: string): string[] {
  const m = html.match(/<script id="data" type="text\/plain">([\s\S]*?)<\/script>/);
  if (!m) return [];
  let obj: unknown;
  try {
    const b64 = m[1].trim().replace(/&amp;/g, "&");
    obj = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  } catch {
    return [];
  }
  const out: string[] = [];
  const walk = (o: unknown) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === "object") {
      const r = o as Record<string, unknown>;
      const u = r.url ?? r.link ?? r.linkUrl;
      if (typeof u === "string" && /^https?:/.test(u)) out.push(u);
      Object.values(r).forEach(walk);
    }
  };
  walk(obj);
  return out;
}

/** Pick the most likely official homepage from a set of candidate URLs. Pure. */
export function pickBestWebsite(urls: string[]): string | null {
  const seen = new Set<string>();
  const scored: { url: string; score: number }[] = [];
  for (const raw of urls) {
    const url = unwrapInstagramUrl(raw);
    if (JUNK_HOSTS.test(url) || isAggregator(url)) continue;
    let host: string;
    try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { continue; }
    if (seen.has(host)) continue;
    seen.add(host);
    let score = 0;
    if (MARKETPLACES.test(url)) score -= 5; // a shop link, not the brand site
    if (url.startsWith("https")) score += 1;
    score -= host.split(".").length * 0.2; // prefer a root domain over deep subdomains
    scored.push({ url, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.url ?? null;
}

/**
 * Discover a brand's official website from its Instagram profile links —
 * unwrapping IG redirects and expanding link-in-bio aggregators (litt.ly) to
 * find the real homepage among shop/social links. Returns null if none found.
 */
export async function resolveBrandWebsite(profile: IgProfile): Promise<string | null> {
  const raw = [profile.externalUrl, ...profile.bioLinks.map((b) => b.url)]
    .filter((u): u is string => !!u)
    .map(unwrapInstagramUrl);
  const candidates: string[] = [];
  for (const u of raw) {
    if (isAggregator(u)) {
      const html = await fetchText(u, 10000);
      if (html) candidates.push(...parseLittlyLinks(html));
    } else {
      candidates.push(u);
    }
  }
  return pickBestWebsite(candidates.length ? candidates : raw);
}

/** Fetch a website and extract brand signals. Throws only on a hard fetch fail. */
export async function fetchWebsiteSignals(rawUrl: string): Promise<WebSignals> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  const html = await fetchText(url);
  if (html === null) throw new Error("웹사이트를 불러오지 못했습니다. 주소를 확인해 주세요.");

  const meta = parseHtmlMeta(html);
  const cssUrls = selectStylesheets(html, url);
  const cssTexts = (await Promise.all(cssUrls.map((u) => fetchText(u, 10000)))).filter(
    (t): t is string => t !== null
  );
  const combined = [html, ...cssTexts].join("\n");

  const fonts = extractBrandFonts(combined);
  const cssColors = extractBrandColors(combined);
  const ogPalette = meta.ogImageUrl ? await extractPalette([meta.ogImageUrl]) : [];

  return { url, ...meta, fonts, cssColors, ogPalette };
}
