import type { AspectRatio } from "@/types/carousel";
import { DIMENSIONS } from "@/types/carousel";

/**
 * Extract Google Font family names from slide HTML.
 * Looks for font-family declarations in inline styles and <style> tags.
 */
export function extractFontFamilies(html: string): string[] {
  const families = new Set<string>();
  const generics = new Set([
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "inherit",
    "initial",
    "unset",
  ]);
  // Capture the FULL comma-separated value up to the terminating ; } or newline,
  // then split on commas. The previous pattern stopped at the first quote inside the
  // value, dropping every fallback family after the first (e.g. "Nanum Myeongjo" in a
  // Korean headline chain), so those fonts were never requested from Google Fonts.
  const regex = /font-family:\s*([^;}\n]+)/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    // Trim a trailing quote/closer that may have been swept up at the value end.
    const raw = match[1].replace(/['"]\s*$/, "").trim();
    for (const part of raw.split(",")) {
      const name = part.trim().replace(/['"]/g, "").trim();
      if (name && !generics.has(name.toLowerCase())) {
        families.add(name);
      }
    }
  }
  return Array.from(families);
}

/**
 * Wraps slide body HTML into a full HTML document at the correct dimensions.
 * This is THE shared rendering contract between preview (iframe) and export (Puppeteer).
 */
export function wrapSlideHtml(
  slideHtml: string,
  aspectRatio: AspectRatio,
  options?: { inlineFontCss?: string }
): string {
  const { width, height } = DIMENSIONS[aspectRatio];
  const fontFamilies = extractFontFamilies(slideHtml);

  // Pretendard is not on Google Fonts; detect via direct text search for robustness
  // (the font-family regex may not capture it when followed by a comma in fallback lists)
  const usesPretendard = /pretendard/i.test(slideHtml);
  const googleFamilies = fontFamilies.filter((f) => !/pretendard/i.test(f));
  const pretendardLink = usesPretendard
    ? `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css">`
    : "";

  let fontBlock = "";
  if (options?.inlineFontCss) {
    // For export: use inlined base64 @font-face CSS
    fontBlock = `<style>${options.inlineFontCss}</style>${pretendardLink}`;
  } else if (googleFamilies.length > 0) {
    // For preview: use Google Fonts CDN link (Pretendard is not on Google Fonts)
    const params = googleFamilies
      .map(
        (f) =>
          `family=${encodeURIComponent(f)}:wght@400;500;600;700;800`
      )
      .join("&");
    fontBlock = `<link href="https://fonts.googleapis.com/css2?${params}&display=swap" rel="stylesheet">${pretendardLink}`;
  } else {
    fontBlock = pretendardLink;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=${width}, initial-scale=1">
  ${fontBlock}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${width}px; height: ${height}px; overflow: hidden; }
  </style>
</head>
<body>
  ${slideHtml}
</body>
</html>`;
}
