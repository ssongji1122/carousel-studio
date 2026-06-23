import type { Slide, AspectRatio } from "@/types/carousel";
import type { BrandConfig } from "@/types/brand";

type StructuredSlide = Pick<Slide, "role" | "headline" | "body" | "media">;

export function renderSlideHtml(
  slide: StructuredSlide,
  brand: BrandConfig,
  _aspect: AspectRatio
): string {
  const c = brand.colors;
  const headFont = `"${brand.fonts.heading}", "Nanum Myeongjo", serif`;
  const bodyFont = `"${brand.fonts.body}", -apple-system, sans-serif`;
  const isHook = slide.role === "hook";
  const isCta = slide.role === "cta";

  const mediaHtml = slide.media
    ? `<img src="${slide.media.src}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${slide.media.fit};opacity:0.9;" />`
    : "";

  const eyebrow = isHook ? "studio.soluta" : isCta ? "지금 보세요" : "";
  const headSize = isHook ? "72px" : "44px";

  return `<div style="position:relative;width:100%;height:100%;background:${c.background};color:${c.primary};padding:9%;display:flex;flex-direction:column;justify-content:center;overflow:hidden;">
  ${mediaHtml}
  <div style="position:relative;z-index:1;">
    ${eyebrow ? `<div style="font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:${c.secondary};margin-bottom:24px;">${eyebrow}</div>` : ""}
    <div style="font-family:${headFont};font-weight:400;font-size:${headSize};line-height:1.05;word-break:keep-all;color:${c.primary};">${escapeHtml(slide.headline)}</div>
    ${slide.body ? `<div style="font-family:${bodyFont};font-weight:400;font-size:24px;line-height:1.75;word-break:keep-all;color:${c.secondary};margin-top:28px;">${escapeHtml(slide.body)}</div>` : ""}
    ${isCta ? `<div style="margin-top:40px;display:inline-block;font-family:'JetBrains Mono',monospace;font-size:15px;color:${c.accent};border-bottom:2px solid ${c.accent};padding-bottom:4px;">-></div>` : ""}
  </div>
</div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
