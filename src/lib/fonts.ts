import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const FONT_CACHE_DIR = path.resolve(process.cwd(), "data", ".font-cache");
const FONT_FETCH_TIMEOUT_MS = 5000;

// In-memory cache (survives across requests, lost on restart)
const memoryCache = new Map<string, string>();
const missingCache = new Set<string>();
const LOCAL_FONT_FAMILIES = new Set([
  "-apple-system",
  "arial",
  "blinkmacsystemfont",
  "pretendard",
  "system-ui",
]);

/**
 * Fetch Google Fonts CSS with inlined base64 woff2 data URIs.
 * This creates a fully self-contained CSS string that works without network access.
 */
export async function getInlinedFontCSS(
  families: string[]
): Promise<string> {
  if (families.length === 0) return "";

  const parts: string[] = [];

  for (const family of families) {
    if (shouldSkipFont(family)) continue;
    const cached = await getCachedFont(family);
    if (cached) {
      parts.push(cached);
      continue;
    }

    try {
      const css = await fetchAndInlineFont(family);
      if (css) {
        await cacheFont(family, css);
        parts.push(css);
      } else {
        missingCache.add(normalizeFontName(family));
      }
    } catch {
      missingCache.add(normalizeFontName(family));
      // Font not available — skip silently, system font fallback will be used
    }
  }

  return parts.join("\n");
}

function shouldSkipFont(family: string): boolean {
  const normalized = normalizeFontName(family);
  return LOCAL_FONT_FAMILIES.has(normalized) || missingCache.has(normalized);
}

function normalizeFontName(family: string): string {
  return family.trim().replace(/^['"]|['"]$/g, "").toLowerCase();
}

async function getCachedFont(family: string): Promise<string | null> {
  // Check memory first
  if (memoryCache.has(family)) {
    return memoryCache.get(family)!;
  }

  // Check disk
  try {
    const diskPath = path.join(
      FONT_CACHE_DIR,
      `${family.replace(/\s/g, "-")}.css`
    );
    const css = await readFile(diskPath, "utf-8");
    memoryCache.set(family, css);
    return css;
  } catch {
    return null;
  }
}

async function cacheFont(family: string, css: string): Promise<void> {
  memoryCache.set(family, css);
  try {
    await mkdir(FONT_CACHE_DIR, { recursive: true });
    const diskPath = path.join(
      FONT_CACHE_DIR,
      `${family.replace(/\s/g, "-")}.css`
    );
    await writeFile(diskPath, css, "utf-8");
  } catch {
    // Disk cache write failed — not critical
  }
}

async function fetchAndInlineFont(family: string): Promise<string | null> {
  // Fetch CSS from Google Fonts (with woff2-capable user agent)
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;500;600;700;800&display=block`;
  const response = await fetchWithTimeout(url, {
    headers: {
      // User agent that tells Google to serve woff2 format
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) return null;
  let css = await response.text();

  // Find all url() references to woff2 files and inline them
  const urlRegex = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g;
  const matches = [...css.matchAll(urlRegex)];

  for (const match of matches) {
    const fontUrl = match[1];
    try {
      const fontResponse = await fetchWithTimeout(fontUrl);
      if (!fontResponse.ok) continue;
      const buffer = await fontResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      css = css.replace(
        fontUrl,
        `data:font/woff2;base64,${base64}`
      );
    } catch {
      // Keep the original URL — Puppeteer can still fetch it
    }
  }

  // Ensure font-display: block for deterministic rendering
  css = css.replace(/font-display:\s*swap/g, "font-display: block");

  return css;
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FONT_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
