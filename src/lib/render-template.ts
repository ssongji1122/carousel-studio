import type { Slide, AspectRatio } from "@/types/carousel";
import type { BrandConfig } from "@/types/brand";

type StructuredSlide = Pick<Slide, "role" | "headline" | "body" | "media">;

// Compact (SNS) sizing tokens, scaled for the 1080px export canvas.
// This tool only outputs Instagram/Threads, so it always uses the brand's
// Compact variant (typography.md): JetBrains Mono 700 headlines (Korean
// glyphs fall back to Pretendard 700), Pretendard 500 body. The color
// palette stays DNA-locked. Sizes are tuned for phone-feed readability.
const SIZE = {
  eyebrow: 23,
  hookHead: 100,
  head: 60,
  body: 38,
  cta: 28,
};

export function renderSlideHtml(
  slide: StructuredSlide,
  brand: BrandConfig,
  _aspect: AspectRatio
): string {
  const c = brand.colors;
  const mono = brand.fonts.mono || "JetBrains Mono";
  // Compact headline: Korean is primary, so Pretendard 700 leads (clean Hangul,
  // no monospace word-gaps); Mono stays the editorial signature on eyebrow + CTA.
  // Single quotes only — values live inside a double-quoted style attribute,
  // so double quotes here would terminate the attribute and break the style.
  const headFont = `'${brand.fonts.body}', '${mono}', sans-serif`;
  const bodyFont = `'${brand.fonts.body}', -apple-system, sans-serif`;
  const isHook = slide.role === "hook";
  const isCta = slide.role === "cta";

  const mediaHtml = slide.media
    ? `<img src="${slide.media.src}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${slide.media.fit};opacity:0.9;" />`
    : "";

  const eyebrow = isHook ? "studio.soluta" : isCta ? "next" : "";
  const headSize = isHook ? SIZE.hookHead : SIZE.head;

  return `<div style="position:relative;width:100%;height:100%;background:${c.background};color:${c.primary};padding:8%;display:flex;flex-direction:column;justify-content:center;gap:34px;overflow:hidden;">
  ${mediaHtml}
  <div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:34px;">
    ${eyebrow ? `<div style="font-family:'${mono}',monospace;font-weight:500;font-size:${SIZE.eyebrow}px;letter-spacing:0.14em;text-transform:uppercase;color:${c.secondary};">${eyebrow}</div>` : ""}
    <div style="font-family:${headFont};font-weight:700;font-size:${headSize}px;line-height:1.12;letter-spacing:-0.01em;word-break:keep-all;color:${c.primary};">${escapeHtml(slide.headline)}</div>
    ${slide.body ? `<div style="font-family:${bodyFont};font-weight:500;font-size:${SIZE.body}px;line-height:1.6;word-break:keep-all;color:${c.secondary};">${escapeHtml(slide.body)}</div>` : ""}
    ${isCta ? `<div style="margin-top:8px;display:inline-flex;align-items:center;gap:14px;font-family:'${mono}',monospace;font-weight:700;font-size:${SIZE.cta}px;color:${c.accent};">자세히 보기<span style="border-bottom:3px solid ${c.accent};width:72px;"></span></div>` : ""}
  </div>
</div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
