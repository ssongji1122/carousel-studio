import type { Slide, AspectRatio } from "@/types/carousel";
import type { BrandConfig } from "@/types/brand";

type StructuredSlide = Pick<Slide, "role" | "headline" | "body" | "items" | "media">;

// Compact (SNS) sizing tokens, scaled for the 1080px export canvas.
// This tool only outputs Instagram/Threads, so it always uses the brand's
// Compact variant (typography.md): bold Pretendard 700 headlines (Korean
// primary, Mono fallback for Latin), Pretendard 500 body. Color palette is
// DNA-locked. Sizes are tuned for phone-feed readability.
const SIZE = {
  eyebrow: 23,
  coverHead: 100,
  head: 58,
  body: 38,
  item: 36,
  itemNum: 30,
  cta: 28,
};

export function renderSlideHtml(
  slide: StructuredSlide,
  brand: BrandConfig,
  _aspect: AspectRatio
): string {
  const c = brand.colors;
  const mono = brand.fonts.mono || "JetBrains Mono";
  // Korean is primary, so Pretendard 700 leads (clean Hangul, no monospace
  // word-gaps); Mono stays the editorial signature on eyebrow + CTA.
  // Single quotes only — values live inside a double-quoted style attribute.
  const headFont = `'${brand.fonts.body}', '${mono}', sans-serif`;
  const bodyFont = `'${brand.fonts.body}', -apple-system, sans-serif`;

  const hasItems = Array.isArray(slide.items) && slide.items.length > 0;
  const layout = slide.role === "hook" ? "cover"
    : slide.role === "cta" ? "closing"
    : hasItems ? "list" : "statement";

  const mediaHtml = slide.media
    ? `<img src="${slide.media.src}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${slide.media.fit};opacity:0.9;" />`
    : "";

  const eyebrowText = layout === "cover" ? "studio.soluta" : layout === "closing" ? "next" : "";
  const eyebrow = eyebrowText
    ? `<div style="font-family:'${mono}',monospace;font-weight:500;font-size:${SIZE.eyebrow}px;letter-spacing:0.14em;text-transform:uppercase;color:${c.secondary};">${eyebrowText}</div>`
    : "";

  const accentBar = `<div style="width:56px;height:4px;background:${c.accent};border-radius:2px;"></div>`;

  const headSize = layout === "cover" ? SIZE.coverHead : SIZE.head;
  const headline = `<div style="font-family:${headFont};font-weight:700;font-size:${headSize}px;line-height:1.12;letter-spacing:-0.01em;word-break:keep-all;color:${c.primary};">${escapeHtml(slide.headline)}</div>`;

  const bodyHtml = slide.body
    ? `<div style="font-family:${bodyFont};font-weight:500;font-size:${SIZE.body}px;line-height:1.6;word-break:keep-all;color:${c.secondary};">${escapeHtml(slide.body)}</div>`
    : "";

  let inner = "";
  if (layout === "cover") {
    inner = `${eyebrow}${headline}${bodyHtml}`;
  } else if (layout === "list") {
    const lis = slide.items.map((it, i) =>
      `<div style="display:flex;gap:20px;align-items:baseline;">
        <span style="font-family:'${mono}',monospace;font-weight:700;font-size:${SIZE.itemNum}px;color:${c.accent};flex:none;">${String(i + 1).padStart(2, "0")}</span>
        <span style="font-family:${bodyFont};font-weight:500;font-size:${SIZE.item}px;line-height:1.45;word-break:keep-all;color:${c.primary};">${escapeHtml(it)}</span>
      </div>`).join("");
    inner = `${accentBar}${headline}<div style="display:flex;flex-direction:column;gap:22px;margin-top:8px;">${lis}</div>`;
  } else if (layout === "closing") {
    const ctaLine = `<div style="margin-top:8px;display:inline-flex;align-items:center;gap:14px;font-family:'${mono}',monospace;font-weight:700;font-size:${SIZE.cta}px;color:${c.accent};">자세히 보기<span style="border-bottom:3px solid ${c.accent};width:72px;"></span></div>`;
    inner = `${eyebrow}${headline}${bodyHtml}${ctaLine}`;
  } else {
    inner = `${accentBar}${headline}${bodyHtml}`;
  }

  return `<div style="position:relative;width:100%;height:100%;background:${c.background};color:${c.primary};padding:8%;display:flex;flex-direction:column;justify-content:center;gap:30px;overflow:hidden;">
  ${mediaHtml}
  <div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:30px;">
    ${inner}
  </div>
</div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
