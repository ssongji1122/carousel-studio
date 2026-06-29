import type { CharacterFrame, CharacterScene, CharacterSheet, Slide, AspectRatio } from "@/types/carousel";
import type { BrandConfig } from "@/types/brand";
import {
  DEFAULT_MEDIA_HEIGHT_PCT,
  DEFAULT_MEDIA_OBJECT_POS,
  DEFAULT_MEDIA_SCALE_PCT,
} from "@/lib/slide-style";
import { findCharacterFrame } from "@/lib/character-sheet";

type StructuredSlide = Pick<Slide, "role" | "headline" | "body" | "items" | "media" | "tone" | "style">;

const DEFAULT_CTA_LABEL = "자세히 보기";
const CTA_LABEL_RULES = [
  { keyword: "저장", label: "저장하기" },
  { keyword: "공유", label: "공유하기" },
  { keyword: "댓글", label: "댓글 남기기" },
  { keyword: "문의", label: "문의하기" },
  { keyword: "신청", label: "신청하기" },
  { keyword: "구매", label: "구매하기" },
] as const;

// Compact (SNS) sizing tokens for the 1080px export canvas. This tool only
// outputs Instagram/Threads. Headlines lead with the brand's heading font so
// each imported brand keeps its own face (a serif brand reads as serif, a mono
// brand as mono); Nanum Myeongjo is the Korean serif fallback when the heading
// font carries no Hangul glyphs (e.g. Cormorant, Playfair), and the body font
// is the final fallback. Body stays at weight 500, and the heading font also
// drives display numerals (DNA lock). Tonal background shifts give rhythm.
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
  _aspect: AspectRatio,
  characterSheet?: CharacterSheet
): string {
  void _aspect;
  const c = brand.colors;
  const mono = brand.fonts.mono || "JetBrains Mono";
  const serif = brand.fonts.heading || "Cormorant Garamond"; // DNA lock: numerals
  const style = slide.style ?? {};
  const headingFontName = style.headingFont || serif;
  const bodyFontName = style.bodyFont || brand.fonts.body;
  // Headline leads with the brand heading font; Nanum Myeongjo is the Korean
  // serif fallback for Latin-only heading faces; body font is the last resort.
  const headFont = `'${headingFontName}', 'Nanum Myeongjo', '${bodyFontName}', sans-serif`;
  const bodyFont = `'${bodyFontName}', -apple-system, sans-serif`;
  const numFont = `'${headingFontName}', 'Nanum Myeongjo', serif`;

  const eucalyptus = c.eucalyptus || c.accent;
  const darkBg = c.dark || "#181816";
  const accentDark = c.accentDark || c.accent;
  const paperMute = "rgba(245,244,240,0.66)";
  const hasItems = Array.isArray(slide.items) && slide.items.length > 0;
  const layout = slide.role === "hook" ? "cover"
    : slide.role === "cta" ? "closing"
    : hasItems ? "list" : "statement";

  // Tone = color scheme, independent of layout. Default derives from layout
  // (backward compatible); slide.tone overrides so a deck can mix rich brand
  // sections (e.g. a wine-toned quote). Brand-lock numerals/fonts stay fixed.
  const defaultTone: NonNullable<StructuredSlide["tone"]> =
    layout === "list" ? "soft" : layout === "statement" ? "dark" : "paper";
  const tone = slide.tone || defaultTone;
  const wineBg = c.soot || darkBg;
  const isDark = tone === "dark" || tone === "wine";
  const bgBase = tone === "soft" ? c.surface
    : tone === "dark" ? darkBg
    : tone === "wine" ? wineBg
    : c.background;
  const bg = style.backgroundColor || bgBase;
  const ink = style.headlineColor || (isDark ? c.background : c.primary);
  const subInk = style.bodyColor || (isDark ? paperMute : c.secondary);
  const itemInk = style.itemColor || ink;
  const accentInk = style.accentColor || (isDark ? accentDark : c.accent);
  const lineColor = isDark ? "rgba(245,244,240,0.22)" : c.line;
  const mediaScale = style.mediaScalePct ?? DEFAULT_MEDIA_SCALE_PCT;
  const mediaX = style.mediaObjectX ?? DEFAULT_MEDIA_OBJECT_POS;
  const mediaY = style.mediaObjectY ?? DEFAULT_MEDIA_OBJECT_POS;
  const mediaLayout = style.mediaLayout ?? "framed";
  const characterFrame = findCharacterFrame(characterSheet, style.characterFrameId);
  const characterScene = characterFrame?.scene ?? style.characterScene;
  const imageTransform =
    `object-position:${mediaX}% ${mediaY}%;transform:scale(${mediaScale / 100});transform-origin:${mediaX}% ${mediaY}%;`;

  const mediaHtml = slide.media
    ? `<img src="${slide.media.src}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${slide.media.fit};opacity:0.9;${imageTransform}" />`
    : "";

  const textPosition = (x = 0, y = 0) =>
    `position:relative;left:${x}px;top:${y}px;`;

  const headline = (size: number) =>
    `<div data-edit="headline" style="${textPosition(style.headlineOffsetX, style.headlineOffsetY)}font-family:${headFont};font-weight:700;font-size:${style.headlineFontSize ?? size}px;line-height:1.12;letter-spacing:-0.01em;word-break:keep-all;color:${ink};">${escapeHtml(slide.headline)}</div>`;

  const bodyHtml = (color: string) =>
    slide.body
      ? `<div data-edit="body" style="${textPosition(style.bodyOffsetX, style.bodyOffsetY)}font-family:${bodyFont};font-weight:500;font-size:${style.bodyFontSize ?? SIZE.body}px;line-height:1.62;word-break:keep-all;color:${color};">${escapeHtml(slide.body)}</div>`
      : "";

  if (characterScene) {
    const visualHeight = style.mediaHeightPct ?? 58;
    const characterAssetUrl = characterFrame?.referenceImageUrls?.[0];
    const capHead = slide.headline
      ? `<div data-edit="headline" style="${textPosition(style.headlineOffsetX, style.headlineOffsetY)}font-family:${headFont};font-weight:700;font-size:${style.headlineFontSize ?? SIZE.head}px;line-height:1.14;letter-spacing:-0.01em;word-break:keep-all;color:${ink};">${escapeHtml(slide.headline)}</div>`
      : "";
    const capBody = slide.body
      ? `<div data-edit="body" style="${textPosition(style.bodyOffsetX, style.bodyOffsetY)}font-family:${bodyFont};font-weight:500;font-size:${style.bodyFontSize ?? (SIZE.body - 4)}px;line-height:1.55;word-break:keep-all;color:${subInk};">${escapeHtml(slide.body)}</div>`
      : "";
    const itemHtml = slide.items.length
      ? `<div style="display:flex;flex-direction:column;gap:12px;">${slide.items.map((it, i) =>
          `<div style="display:flex;gap:16px;align-items:baseline;">
            <span style="font-family:${numFont};font-size:32px;line-height:1;color:${accentInk};min-width:38px;">${String(i + 1).padStart(2, "0")}</span>
            <span data-edit="item" data-edit-index="${i}" style="${textPosition(style.itemOffsetX, style.itemOffsetY)}font-family:${bodyFont};font-weight:500;font-size:${style.itemFontSize ?? 27}px;line-height:1.42;word-break:keep-all;color:${itemInk};">${escapeHtml(it)}</span>
          </div>`).join("")}</div>`
      : "";

    return `<div style="position:relative;width:100%;height:100%;background:${bg};color:${ink};padding:8% 8% 11%;display:flex;flex-direction:column;gap:24px;overflow:hidden;">
    <div data-edit="media" data-character-scene="${characterScene}"${characterFrame ? ` data-character-frame="${escapeAttr(characterFrame.id)}" data-character-action="${characterFrame.action}" data-character-expression="${characterFrame.expression}"` : ""} style="height:${visualHeight}%;flex:none;min-height:0;border:1px solid ${accentInk};border-radius:${style.mediaRadius ?? 18}px;overflow:hidden;background:${sceneBackground(characterScene, c.surface)};">
      ${characterAssetUrl
        ? `<img src="${escapeAttr(characterAssetUrl)}" alt="${escapeAttr(characterFrame?.label ?? "포곤 캐릭터 레퍼런스")}" style="width:100%;height:100%;object-fit:cover;display:block;${imageTransform}" />`
        : characterSceneHtml(characterScene, { ink, subInk, accent: accentInk, surface: c.surface, line: lineColor }, characterFrame)}
    </div>
    ${capHead}${capBody}${itemHtml}
  </div>`;
  }

  // Media region: when a slide carries an image, render it inside a framed
  // region on the brand paper (museum-plate feel) with the headline/body as a
  // caption below — instead of a full-bleed wash behind the text.
  if (slide.media) {
    const src = slide.media.src;
    const fit = slide.media.fit || "cover";
    const big = slide.role === "hook";
    const mediaHeight = style.mediaHeightPct ?? DEFAULT_MEDIA_HEIGHT_PCT;
    const mediaRadius = style.mediaRadius ?? 6;
    const capHead = slide.headline
      ? `<div data-edit="headline" style="${textPosition(style.headlineOffsetX, style.headlineOffsetY)}font-family:${headFont};font-weight:700;font-size:${style.headlineFontSize ?? (big ? SIZE.head : 44)}px;line-height:1.14;letter-spacing:-0.01em;word-break:keep-all;color:${ink};">${escapeHtml(slide.headline)}</div>`
      : "";
    const capBody = slide.body
      ? `<div data-edit="body" style="${textPosition(style.bodyOffsetX, style.bodyOffsetY)}font-family:${bodyFont};font-weight:500;font-size:${style.bodyFontSize ?? (SIZE.body - 4)}px;line-height:1.55;word-break:keep-all;color:${subInk};">${escapeHtml(slide.body)}</div>`
      : "";
    if (mediaLayout === "fullBleed") {
      return `<div style="position:relative;width:100%;height:100%;background:${bg};color:${ink};overflow:hidden;">
    <div data-edit="media" style="position:absolute;inset:0;overflow:hidden;background:${c.surface};">
      <img src="${src}" alt="" style="width:100%;height:100%;object-fit:${fit};display:block;${imageTransform}" />
    </div>
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(0,0,0,0.22) 100%);"></div>
    <div style="position:absolute;left:8%;right:8%;bottom:8%;z-index:1;display:flex;flex-direction:column;gap:18px;text-shadow:0 2px 18px rgba(255,255,255,0.58);">
      ${capHead}${capBody}
    </div>
  </div>`;
    }
    return `<div style="position:relative;width:100%;height:100%;background:${bg};color:${ink};padding:8% 8% 11%;display:flex;flex-direction:column;gap:24px;overflow:hidden;">
    <div data-edit="media" style="height:${mediaHeight}%;flex:none;min-height:0;border:1px solid ${accentInk};border-radius:${mediaRadius}px;overflow:hidden;background:${c.surface};">
      <img src="${src}" alt="" style="width:100%;height:100%;object-fit:${fit};display:block;${imageTransform}" />
    </div>
    ${capHead}${capBody}
  </div>`;
  }

  let inner = "";
  if (layout === "cover") {
    inner = `${headline(SIZE.coverHead)}${bodyHtml(subInk)}`;
  } else if (layout === "list") {
    const lis = slide.items.map((it, i) =>
      `<div style="display:flex;gap:26px;align-items:baseline;border-top:1px solid ${lineColor};padding-top:16px;">
        <span style="font-family:${numFont};font-weight:500;font-size:${SIZE.itemNum}px;line-height:0.9;color:${eucalyptus};flex:none;min-width:64px;">${String(i + 1).padStart(2, "0")}</span>
        <span data-edit="item" data-edit-index="${i}" style="${textPosition(style.itemOffsetX, style.itemOffsetY)}font-family:${bodyFont};font-weight:500;font-size:${style.itemFontSize ?? SIZE.item}px;line-height:1.4;word-break:keep-all;color:${itemInk};">${escapeHtml(it)}</span>
      </div>`).join("");
    inner = `${headline(SIZE.head)}<div style="display:flex;flex-direction:column;gap:18px;margin-top:10px;">${lis}</div>`;
  } else if (layout === "statement") {
    const quote = `<div style="font-family:${numFont};font-size:120px;line-height:0.5;color:${accentInk};height:64px;">&ldquo;</div>`;
    inner = `${quote}${headline(SIZE.head)}${bodyHtml(subInk)}`;
  } else {
    const ctaPill = `<div style="margin-top:14px;display:inline-flex;align-items:center;gap:14px;align-self:flex-start;background:${c.accent};color:${c.background};font-family:${bodyFont};font-weight:600;font-size:${SIZE.cta}px;padding:16px 30px;border-radius:999px;">${resolveCtaLabel(slide)} <span style="font-family:'${mono}',monospace;">-&gt;</span></div>`;
    inner = `${headline(SIZE.head)}${bodyHtml(subInk)}${ctaPill}`;
  }

  return `<div style="position:relative;width:100%;height:100%;background:${bg};color:${ink};padding:8% 8% 11%;display:flex;flex-direction:column;justify-content:center;gap:30px;overflow:hidden;">
  ${mediaHtml}
  <div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:30px;">
    ${inner}
  </div>
</div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

function resolveCtaLabel(slide: StructuredSlide): string {
  const source = `${slide.headline} ${slide.body} ${slide.items.join(" ")}`;
  return CTA_LABEL_RULES.find((rule) => source.includes(rule.keyword))?.label ?? DEFAULT_CTA_LABEL;
}

function sceneBackground(scene: CharacterScene, fallback: string): string {
  if (scene === "relieved") return "linear-gradient(180deg,#DDF7FF 0%,#FCFEFF 100%)";
  if (scene === "patch") return "linear-gradient(180deg,#CBEEFA 0%,#FFF7BF 100%)";
  if (scene === "rollon") return "linear-gradient(180deg,#F7FCFF 0%,#CBEEFA 100%)";
  return fallback;
}

function characterSceneHtml(
  scene: CharacterScene,
  colors: { ink: string; subInk: string; accent: string; surface: string; line: string },
  frame?: CharacterFrame
): string {
  const action = frame?.action;
  const expression = frame?.expression;
  const isTired = expression ? expression === "tired" || expression === "strained" : scene === "tired";
  const isRollon = action ? action === "use-rollon" : scene === "rollon";
  const isPatch = action ? action === "apply-patch" : scene === "patch";
  const isRelieved = expression ? expression === "relieved" : scene === "relieved";
  const waveOpacity = isRelieved ? 0.18 : 0.64;
  const mouth = isRelieved
    ? `<path d="M470 390 Q500 420 530 390" fill="none" stroke="${colors.ink}" stroke-width="8" stroke-linecap="round"/>`
    : `<path d="M460 402 Q500 ${isTired ? 384 : 398} 540 402" fill="none" stroke="${colors.ink}" stroke-width="8" stroke-linecap="round"/>`;
  const patch = isPatch
    ? `<rect x="415" y="250" width="170" height="72" rx="36" fill="#FEE578" stroke="${colors.ink}" stroke-width="7"/>`
    : "";
  const rollon = isRollon
    ? `<g transform="translate(650 250) rotate(-18)">
        <rect x="0" y="45" width="110" height="250" rx="55" fill="#A9DDF6" stroke="${colors.ink}" stroke-width="7"/>
        <rect x="22" y="0" width="66" height="75" rx="33" fill="#F8B7CF" stroke="${colors.ink}" stroke-width="7"/>
        <path d="M35 294 H75 V342 Q55 360 35 342 Z" fill="#A9DDF6" stroke="${colors.ink}" stroke-width="7"/>
      </g>`
    : "";
  const hands = isRollon
    ? `<ellipse cx="625" cy="445" rx="74" ry="38" fill="#FFFDF8" stroke="${colors.ink}" stroke-width="7" transform="rotate(-16 625 445)"/>`
    : `<ellipse cx="345" cy="455" rx="66" ry="38" fill="#FFFDF8" stroke="${colors.ink}" stroke-width="7" transform="rotate(18 345 455)"/>
       <ellipse cx="655" cy="455" rx="66" ry="38" fill="#FFFDF8" stroke="${colors.ink}" stroke-width="7" transform="rotate(-18 655 455)"/>`;

  return `<svg viewBox="0 0 1000 620" width="100%" height="100%" role="img" aria-label="${escapeAttr(frame?.label ?? "포곤 캐릭터 장면")}" style="display:block;">
    <rect x="80" y="58" width="840" height="42" rx="21" fill="rgba(255,255,255,0.58)"/>
    <path d="M180 360 C120 260 150 175 230 135" fill="none" stroke="${colors.accent}" stroke-width="10" stroke-linecap="round" opacity="${waveOpacity}"/>
    <path d="M820 350 C880 250 850 165 770 125" fill="none" stroke="${colors.accent}" stroke-width="10" stroke-linecap="round" opacity="${waveOpacity}"/>
    <path d="M370 245 C405 145 595 145 630 245 C710 250 745 330 705 395 C650 485 350 485 295 395 C255 330 290 250 370 245 Z" fill="#FFFDF8" stroke="${colors.ink}" stroke-width="8" stroke-linejoin="round"/>
    <ellipse cx="350" cy="340" rx="85" ry="92" fill="#FFFDF8" stroke="${colors.ink}" stroke-width="8"/>
    <ellipse cx="650" cy="340" rx="85" ry="92" fill="#FFFDF8" stroke="${colors.ink}" stroke-width="8"/>
    <path d="M497 145 C548 120 588 155 562 205 C518 207 484 184 497 145 Z" fill="#16AE02" stroke="${colors.ink}" stroke-width="7" stroke-linejoin="round"/>
    ${patch}
    <circle cx="440" cy="350" r="8" fill="${colors.ink}"/>
    <circle cx="560" cy="350" r="8" fill="${colors.ink}"/>
    ${mouth}
    ${hands}
    ${rollon}
    <line x1="120" y1="555" x2="880" y2="555" stroke="${colors.line}" stroke-width="4" opacity="0.8"/>
    ${isTired ? `<text x="285" y="185" fill="${colors.accent}" font-family="Arial, sans-serif" font-size="54" font-weight="700" transform="rotate(-12 285 185)">...</text>` : ""}
    ${isRelieved ? `<circle cx="750" cy="185" r="46" fill="#FEE578" stroke="${colors.ink}" stroke-width="7"/>` : ""}
  </svg>`;
}
