// Analyzes a brand's website for design signals — the real fonts it loads, the
// colors in its theme CSS, the OG image palette, and the page copy — to round
// out (or correct) what an Instagram feed alone can infer. Especially useful
// for fonts: a site declares exactly what it uses, while a feed only hints.
//
// Site builders (WordPress/Gutenberg, etc.) inject their own default palettes
// and system font stacks as noise, so we filter both out before handing the
// candidates to Claude.

import { extractPalette } from "@/lib/instagram-brand";

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

/** Extract brand color candidates (hex), filtering builder/system noise. Pure. */
export function extractBrandColors(text: string): string[] {
  const freq = new Map<string, number>();
  for (const m of text.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
    const hex = m[0].toUpperCase();
    if (!NOISE_COLORS.has(hex)) freq.set(hex, (freq.get(hex) ?? 0) + 1);
  }
  return Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).map(([h]) => h).slice(0, 8);
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
