import type { BrandSources } from "@/lib/brand-doc";
import type {
  BrandAnalysis,
  BrandColorCandidate,
  BrandConfig,
  BrandEvidence,
  BrandEvidenceSource,
  BrandFontCandidate,
  BrandFonts,
  BrandTokenDecision,
  BrandColors,
} from "@/types/brand";

const COLOR_SOURCE_SCORES: Record<BrandEvidenceSource, number> = {
  "website-og": 96,
  "instagram-feed": 90,
  "instagram-profile": 86,
  "website-css": 82,
  "website-image": 76,
  "brand-doc": 58,
};

const FONT_SOURCE_SCORES: Record<BrandEvidenceSource, number> = {
  "website-css": 96,
  "brand-doc": 68,
  "website-og": 0,
  "website-image": 0,
  "instagram-feed": 0,
  "instagram-profile": 0,
};

const SOURCE_INDEX_PENALTY = 2;
const SOURCE_REPEAT_WEIGHT = 0.5;
const MIN_ACCENT_SATURATION = 0.18;
const CONFIDENCE_DIVISOR = 100;
const CONFIDENCE_MIN = 0.45;
const CONFIDENCE_MAX = 0.96;
const DARK_MIX_FOR_ACCENT = 0.35;
const LINE_MIX = 0.18;
const SURFACE_MIX = 0.06;
const SECONDARY_MIX = 0.28;

const KOREAN_FONT_RE =
  /pretendard|noto sans kr|spoqa|suit|nanum|gmarket|wanted sans|apple sd gothic|kopub|maruburi|sandoll/i;
const HANGUL_RE = /[가-힣]/;

type ColorPick = BrandColorCandidate & {
  luminance: number;
  saturation: number;
};

type FontPick = BrandFontCandidate;

export function buildBrandAnalysis(
  sources: BrandSources,
  brand: BrandConfig
): BrandAnalysis | null {
  const evidence = buildEvidence(sources);
  const sourceColorCandidates = buildColorCandidates(sources);
  const colorCandidates = sourceColorCandidates.length
    ? sourceColorCandidates
    : buildFallbackColorCandidates(brand);
  const fontCandidates = buildFontCandidates(sources, brand);

  if (!evidence.length && !sourceColorCandidates.length && !fontCandidates.length) {
    return null;
  }

  const primary = choosePrimaryColor(colorCandidates, brand.colors.primary);
  const background = chooseBackgroundColor(colorCandidates, brand.colors.background);
  const accent = chooseAccentColor(
    colorCandidates,
    brand.colors.accent,
    new Set([primary.value, background.value])
  );
  const heading = chooseHeadingFont(fontCandidates, brand.fonts.heading);
  const body = chooseBodyFont(fontCandidates, brand, sources);
  const hintedColors = applyColorHints(colorCandidates, {
    primary: primary.value,
    accent: accent.value,
    background: background.value,
  });
  const hintedFonts = applyFontHints(fontCandidates, {
    heading: heading.value,
    body: body.value,
  });

  return {
    evidence,
    colorCandidates: hintedColors,
    fontCandidates: hintedFonts,
    decisions: {
      primaryColor: primary,
      accentColor: accent,
      backgroundColor: background,
      headingFont: heading,
      bodyFont: body,
    },
    appliedAt: new Date().toISOString(),
  };
}

export function applyBrandAnalysis(
  brand: BrandConfig,
  analysis: BrandAnalysis
): Partial<Omit<BrandConfig, "createdAt" | "updatedAt">> {
  const colors = applyColorDecisions(brand.colors, analysis);
  const fonts: BrandFonts = {
    ...brand.fonts,
    heading: analysis.decisions.headingFont.value,
    body: analysis.decisions.bodyFont.value,
  };

  return { colors, fonts, analysis };
}

function buildEvidence(sources: BrandSources): BrandEvidence[] {
  const evidence: BrandEvidence[] = [];
  if (sources.ig?.palette.length) {
    evidence.push({
      source: "instagram-feed",
      label: "인스타 피드 팔레트",
      value: sources.ig.palette.join(", "),
      confidence: 0.9,
    });
  }
  if (sources.web?.ogPalette.length) {
    evidence.push({
      source: "website-og",
      label: "웹사이트 OG 이미지 팔레트",
      value: sources.web.ogPalette.join(", "),
      confidence: 0.96,
    });
  }
  if (sources.web?.cssColors.length) {
    evidence.push({
      source: "website-css",
      label: "웹사이트 CSS 색 후보",
      value: sources.web.cssColors.join(", "),
      confidence: 0.82,
    });
  }
  if (sources.web?.fonts.length) {
    evidence.push({
      source: "website-css",
      label: "웹사이트 실제 사용 폰트",
      value: sources.web.fonts.join(", "),
      confidence: 0.96,
    });
  }
  return evidence;
}

function buildColorCandidates(sources: BrandSources): BrandColorCandidate[] {
  const candidates = new Map<string, BrandColorCandidate>();
  const add = (hex: string, source: BrandEvidenceSource, index: number) => {
    const normalized = normalizeHex(hex);
    if (!normalized) return;
    const score = COLOR_SOURCE_SCORES[source] - index * SOURCE_INDEX_PENALTY;
    const existing = candidates.get(normalized);
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
      existing.score += score * SOURCE_REPEAT_WEIGHT;
      return;
    }
    candidates.set(normalized, { hex: normalized, sources: [source], score });
  };

  sources.web?.ogPalette.forEach((hex, index) => add(hex, "website-og", index));
  sources.ig?.palette.forEach((hex, index) => add(hex, "instagram-feed", index));
  sources.web?.cssColors.forEach((hex, index) => add(hex, "website-css", index));

  return sortColorCandidates(Array.from(candidates.values()));
}

function buildFallbackColorCandidates(brand: BrandConfig): BrandColorCandidate[] {
  return sortColorCandidates(
    [
      brand.colors.primary,
      brand.colors.secondary,
      brand.colors.accent,
      brand.colors.background,
      brand.colors.surface,
      brand.colors.line,
    ].flatMap((hex, index) => {
      const normalized = normalizeHex(hex);
      return normalized
        ? [{ hex: normalized, sources: ["brand-doc" as const], score: COLOR_SOURCE_SCORES["brand-doc"] - index }]
        : [];
    })
  );
}

function buildFontCandidates(
  sources: BrandSources,
  brand: BrandConfig
): BrandFontCandidate[] {
  const candidates = new Map<string, BrandFontCandidate>();
  const add = (family: string, source: BrandEvidenceSource, index: number) => {
    const normalized = normalizeFontFamily(family);
    if (!normalized) return;
    const score = FONT_SOURCE_SCORES[source] - index * SOURCE_INDEX_PENALTY;
    const existing = candidates.get(normalized.toLowerCase());
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
      existing.score += score * SOURCE_REPEAT_WEIGHT;
      return;
    }
    candidates.set(normalized.toLowerCase(), { family: normalized, sources: [source], score });
  };

  sources.web?.fonts.forEach((family, index) => add(family, "website-css", index));
  if (!candidates.size) {
    add(brand.fonts.heading, "brand-doc", 0);
    add(brand.fonts.body, "brand-doc", 1);
  }

  return Array.from(candidates.values()).sort((a, b) => b.score - a.score);
}

function choosePrimaryColor(
  candidates: BrandColorCandidate[],
  fallback: string
): BrandTokenDecision {
  const picks = toColorPicks(candidates);
  const pick = picks.sort((a, b) =>
    a.luminance === b.luminance ? b.score - a.score : a.luminance - b.luminance
  )[0];
  return colorDecision(
    pick,
    fallback,
    "primaryColor",
    "후보 중 가장 어두운 색이라 본문 잉크와 브랜드 중심색으로 배정"
  );
}

function chooseBackgroundColor(
  candidates: BrandColorCandidate[],
  fallback: string
): BrandTokenDecision {
  const picks = toColorPicks(candidates);
  const pick = picks.sort((a, b) =>
    a.luminance === b.luminance ? b.score - a.score : b.luminance - a.luminance
  )[0];
  return colorDecision(
    pick,
    fallback,
    "backgroundColor",
    "후보 중 가장 밝은 색이라 캐러셀 배경으로 배정"
  );
}

function chooseAccentColor(
  candidates: BrandColorCandidate[],
  fallback: string,
  excluded: Set<string>
): BrandTokenDecision {
  const picks = toColorPicks(candidates)
    .filter((pick) => !excluded.has(pick.hex))
    .filter((pick) => pick.saturation >= MIN_ACCENT_SATURATION);
  const pick = picks.sort((a, b) =>
    a.saturation === b.saturation ? b.score - a.score : b.saturation - a.saturation
  )[0] ?? toColorPicks(candidates).find((pick) => !excluded.has(pick.hex));
  return colorDecision(
    pick,
    fallback,
    "accentColor",
    "무채색이 아닌 후보 중 채도가 가장 높아 강조색으로 배정"
  );
}

function chooseHeadingFont(
  candidates: BrandFontCandidate[],
  fallback: string
): BrandTokenDecision {
  const pick = candidates[0];
  return fontDecision(
    pick,
    fallback,
    "headingFont",
    pick?.sources.includes("website-css")
      ? "웹사이트 CSS에서 실제 사용 폰트로 감지되어 헤드라인에 배정"
      : "폰트 단서가 부족해 기존 브랜드 헤드라인 폰트 유지"
  );
}

function chooseBodyFont(
  candidates: BrandFontCandidate[],
  brand: BrandConfig,
  sources: BrandSources
): BrandTokenDecision {
  const hasHangul = sourceText(sources).some((text) => HANGUL_RE.test(text));
  const headingFamily = candidates[0]?.family;
  const koreanPick =
    candidates.find((candidate) =>
      candidate.family !== headingFamily && KOREAN_FONT_RE.test(candidate.family)
    ) ?? candidates.find((candidate) => KOREAN_FONT_RE.test(candidate.family));
  const pick = koreanPick ?? candidates[hasHangul && candidates.length > 1 ? 1 : 0];
  const fallback = hasHangul ? "Pretendard" : brand.fonts.body;
  return fontDecision(
    pick,
    fallback,
    "bodyFont",
    pick?.sources.includes("website-css")
      ? "웹사이트 CSS에서 실제 사용 폰트로 감지되어 본문에 배정"
      : "본문 폰트 단서가 부족해 한글 가독성 기준으로 배정"
  );
}

function applyColorDecisions(
  current: BrandColors,
  analysis: BrandAnalysis
): BrandColors {
  const primary = analysis.decisions.primaryColor.value;
  const accent = analysis.decisions.accentColor.value;
  const background = analysis.decisions.backgroundColor.value;
  const surface = pickCandidateByRole(analysis.colorCandidates, "surface")
    ?? mixHex(background, primary, SURFACE_MIX);
  const secondary = pickCandidateByRole(analysis.colorCandidates, "secondary")
    ?? mixHex(primary, background, SECONDARY_MIX);

  return {
    ...current,
    primary,
    secondary,
    accent,
    background,
    surface,
    line: pickCandidateByRole(analysis.colorCandidates, "line") ?? mixHex(background, primary, LINE_MIX),
    dark: primary,
    accentDark: mixHex(accent, primary, DARK_MIX_FOR_ACCENT),
    eucalyptus: accent,
    dusty: surface,
    soot: primary,
  };
}

function applyColorHints(
  candidates: BrandColorCandidate[],
  selected: { primary: string; accent: string; background: string }
): BrandColorCandidate[] {
  const picks = toColorPicks(candidates);
  const sortedLight = [...picks].sort((a, b) => b.luminance - a.luminance);
  const sortedDark = [...picks].sort((a, b) => a.luminance - b.luminance);
  const surface = sortedLight.find((pick) => pick.hex !== selected.background)?.hex;
  const line = sortedLight.find((pick) => pick.hex !== selected.background && pick.hex !== surface)?.hex;
  const secondary = sortedDark.find((pick) => pick.hex !== selected.primary)?.hex;

  return candidates.map((candidate) => ({
    ...candidate,
    roleHint:
      candidate.hex === selected.primary ? "primary"
        : candidate.hex === selected.accent ? "accent"
          : candidate.hex === selected.background ? "background"
            : candidate.hex === surface ? "surface"
              : candidate.hex === line ? "line"
                : candidate.hex === secondary ? "secondary"
                  : candidate.roleHint,
    score: Number(candidate.score.toFixed(2)),
  }));
}

function applyFontHints(
  candidates: BrandFontCandidate[],
  selected: { heading: string; body: string }
): BrandFontCandidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    roleHint:
      candidate.family === selected.heading ? "heading"
        : candidate.family === selected.body ? "body"
          : candidate.roleHint,
    score: Number(candidate.score.toFixed(2)),
  }));
}

function colorDecision(
  pick: ColorPick | undefined,
  fallback: string,
  key: string,
  reason: string
): BrandTokenDecision {
  if (pick) {
    return {
      value: pick.hex,
      source: pick.sources[0],
      confidence: scoreToConfidence(pick.score),
      reason,
    };
  }
  return {
    value: normalizeHex(fallback) ?? fallback,
    source: "brand-doc",
    confidence: CONFIDENCE_MIN,
    reason: `${key}: 명시 후보가 부족해 기존 브랜드 토큰 유지`,
  };
}

function fontDecision(
  pick: FontPick | undefined,
  fallback: string,
  key: string,
  reason: string
): BrandTokenDecision {
  if (pick) {
    return {
      value: pick.family,
      source: pick.sources[0],
      confidence: scoreToConfidence(pick.score),
      reason,
    };
  }
  return {
    value: fallback,
    source: "brand-doc",
    confidence: CONFIDENCE_MIN,
    reason: `${key}: ${reason}`,
  };
}

function toColorPicks(candidates: BrandColorCandidate[]): ColorPick[] {
  return candidates.flatMap((candidate) => {
    const rgb = hexToRgb(candidate.hex);
    return rgb
      ? [{ ...candidate, luminance: relativeLuminance(rgb), saturation: saturation(rgb) }]
      : [];
  });
}

function sortColorCandidates(candidates: BrandColorCandidate[]): BrandColorCandidate[] {
  return candidates.sort((a, b) => b.score - a.score);
}

function pickCandidateByRole(
  candidates: BrandColorCandidate[],
  role: NonNullable<BrandColorCandidate["roleHint"]>
): string | undefined {
  return candidates.find((candidate) => candidate.roleHint === role)?.hex;
}

function normalizeHex(value: string): string | null {
  const token = value.trim();
  const short = token.match(/^#([0-9a-fA-F]{3})$/);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  const full = token.match(/^#([0-9a-fA-F]{6})$/);
  return full ? `#${full[1]}`.toUpperCase() : null;
}

function normalizeFontFamily(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function scoreToConfidence(score: number): number {
  return Math.min(CONFIDENCE_MAX, Math.max(CONFIDENCE_MIN, score / CONFIDENCE_DIVISOR));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function saturation(rgb: { r: number; g: number; b: number }): number {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  return max === 0 ? 0 : (max - min) / max;
}

function mixHex(a: string, b: string, bWeight: number): string {
  const left = hexToRgb(a);
  const right = hexToRgb(b);
  if (!left || !right) return a;
  const channel = (x: number, y: number) =>
    Math.round(x * (1 - bWeight) + y * bWeight).toString(16).padStart(2, "0");
  return `#${channel(left.r, right.r)}${channel(left.g, right.g)}${channel(left.b, right.b)}`.toUpperCase();
}

function sourceText(sources: BrandSources): string[] {
  return [
    sources.ig?.profile.fullName,
    sources.ig?.profile.biography,
    ...(sources.ig?.profile.posts.map((post) => post.caption) ?? []),
    sources.web?.title,
    sources.web?.description,
    sources.web?.ogTitle,
    sources.web?.ogDescription,
    ...(sources.web?.headings ?? []),
    ...(sources.web?.copySnippets ?? []),
  ].filter((text): text is string => Boolean(text));
}
