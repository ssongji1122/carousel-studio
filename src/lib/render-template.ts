import type { Slide, AspectRatio } from "@/types/carousel";
import type { BrandConfig } from "@/types/brand";

type StructuredSlide = Pick<Slide, "role" | "headline" | "body" | "items" | "media">;

// Compact (SNS) sizing tokens for the 1080px export canvas. This tool only
// outputs Instagram/Threads, so it always uses the brand's Compact variant
// (typography.md): bold Pretendard 700 headlines (Korean primary), Pretendard
// 500 body, and Cormorant Garamond for display numerals (DNA lock). Layout
// varies by slide type and tonal background shifts give the deck rhythm.
const SIZE = {
  eyebrow: 22,
  coverHead: 104,
  head: 60,
  body: 37,
  item: 35,
  itemNum: 56,
  cta: 28,
  footer: 18,
};

export function renderSlideHtml(
  slide: StructuredSlide,
  brand: BrandConfig,
  _aspect: AspectRatio
): string {
  const c = brand.colors;
  const mono = brand.fonts.mono || "JetBrains Mono";
  const serif = brand.fonts.heading || "Cormorant Garamond"; // DNA lock: numerals
  // Korean-primary headline: Pretendard 700 leads, Mono fallback for Latin.
  const headFont = `'${brand.fonts.body}', '${mono}', sans-serif`;
  const bodyFont = `'${brand.fonts.body}', -apple-system, sans-serif`;
  const numFont = `'${serif}', 'Nanum Myeongjo', serif`;

  const eucalyptus = c.eucalyptus || c.accent;
  const darkBg = c.dark || "#181816";
  const accentDark = c.accentDark || c.accent;
  const paperMute = "rgba(245,244,240,0.66)";
  const brandName = brand.name || "studio.soluta";

  const hasItems = Array.isArray(slide.items) && slide.items.length > 0;
  const layout = slide.role === "hook" ? "cover"
    : slide.role === "cta" ? "closing"
    : hasItems ? "list" : "statement";

  const isDark = layout === "statement";
  const bg = layout === "cover" ? c.background
    : layout === "list" ? c.surface
    : layout === "statement" ? darkBg
    : c.background;
  const ink = isDark ? c.background : c.primary;
  const subInk = isDark ? paperMute : c.secondary;
  const accentInk = isDark ? accentDark : c.accent;

  const mediaHtml = slide.media
    ? `<img src="${slide.media.src}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${slide.media.fit};opacity:0.9;" />`
    : "";

  const eyebrowRow = (label: string) =>
    `<div style="display:flex;align-items:center;gap:18px;">
      <span style="font-family:'${mono}',monospace;font-weight:500;font-size:${SIZE.eyebrow}px;letter-spacing:0.16em;text-transform:uppercase;color:${accentInk};">${label}</span>
      <span style="flex:1;height:1px;background:${isDark ? "rgba(245,244,240,0.25)" : c.line};"></span>
    </div>`;

  const footer = `<div style="position:absolute;left:8%;bottom:6%;font-family:'${mono}',monospace;font-size:${SIZE.footer}px;letter-spacing:0.12em;text-transform:uppercase;color:${subInk};">${escapeHtml(brandName)}</div>`;

  const headline = (size: number) =>
    `<div style="font-family:${headFont};font-weight:700;font-size:${size}px;line-height:1.12;letter-spacing:-0.01em;word-break:keep-all;color:${ink};">${escapeHtml(slide.headline)}</div>`;

  const bodyHtml = (color: string) =>
    slide.body
      ? `<div style="font-family:${bodyFont};font-weight:500;font-size:${SIZE.body}px;line-height:1.62;word-break:keep-all;color:${color};">${escapeHtml(slide.body)}</div>`
      : "";

  // Media region: when a slide carries an image, render it inside a framed
  // region on the brand paper (museum-plate feel) with the headline/body as a
  // caption below — instead of a full-bleed wash behind the text.
  if (slide.media) {
    const src = slide.media.src;
    const fit = slide.media.fit || "cover";
    const big = slide.role === "hook";
    const capHead = slide.headline
      ? `<div style="font-family:${headFont};font-weight:700;font-size:${big ? SIZE.head : 44}px;line-height:1.14;letter-spacing:-0.01em;word-break:keep-all;color:${c.primary};">${escapeHtml(slide.headline)}</div>`
      : "";
    const capBody = slide.body
      ? `<div style="font-family:${bodyFont};font-weight:500;font-size:${SIZE.body - 4}px;line-height:1.55;word-break:keep-all;color:${c.secondary};">${escapeHtml(slide.body)}</div>`
      : "";
    return `<div style="position:relative;width:100%;height:100%;background:${c.background};color:${c.primary};padding:8% 8% 11%;display:flex;flex-direction:column;gap:24px;overflow:hidden;">
    ${eyebrowRow(brandName)}
    <div style="flex:1;min-height:0;border:1px solid ${c.line};border-radius:6px;overflow:hidden;background:${c.surface};">
      <img src="${src}" alt="" style="width:100%;height:100%;object-fit:${fit};display:block;" />
    </div>
    ${capHead}${capBody}
    ${footer}
  </div>`;
  }

  let inner = "";
  if (layout === "cover") {
    inner = `${eyebrowRow(brandName)}${headline(SIZE.coverHead)}${bodyHtml(subInk)}`;
  } else if (layout === "list") {
    const lis = slide.items.map((it, i) =>
      `<div style="display:flex;gap:26px;align-items:baseline;border-top:1px solid ${c.line};padding-top:16px;">
        <span style="font-family:${numFont};font-weight:500;font-size:${SIZE.itemNum}px;line-height:0.9;color:${eucalyptus};flex:none;min-width:64px;">${String(i + 1).padStart(2, "0")}</span>
        <span style="font-family:${bodyFont};font-weight:500;font-size:${SIZE.item}px;line-height:1.4;word-break:keep-all;color:${ink};">${escapeHtml(it)}</span>
      </div>`).join("");
    inner = `${eyebrowRow("list")}${headline(SIZE.head)}<div style="display:flex;flex-direction:column;gap:18px;margin-top:10px;">${lis}</div>`;
  } else if (layout === "statement") {
    const quote = `<div style="font-family:${numFont};font-size:120px;line-height:0.5;color:${accentDark};height:64px;">&ldquo;</div>`;
    inner = `${quote}${headline(SIZE.head)}${bodyHtml(paperMute)}`;
  } else {
    const ctaPill = `<div style="margin-top:14px;display:inline-flex;align-items:center;gap:14px;align-self:flex-start;background:${c.accent};color:${c.background};font-family:${bodyFont};font-weight:600;font-size:${SIZE.cta}px;padding:16px 30px;border-radius:999px;">자세히 보기 <span style="font-family:'${mono}',monospace;">-&gt;</span></div>`;
    inner = `${eyebrowRow("next")}${headline(SIZE.head)}${bodyHtml(subInk)}${ctaPill}`;
  }

  return `<div style="position:relative;width:100%;height:100%;background:${bg};color:${ink};padding:8% 8% 11%;display:flex;flex-direction:column;justify-content:center;gap:30px;overflow:hidden;">
  ${mediaHtml}
  <div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:30px;">
    ${inner}
  </div>
  ${footer}
</div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
