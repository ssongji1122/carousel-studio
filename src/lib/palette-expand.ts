import type { BrandColors } from "@/types/brand";

// Self-contained OKLCH palette expansion (no external color lib). Takes one
// seed color and derives a coherent, accessibility-checked brand token set —
// the core of a "Color Expert" style step: seed -> OKLCH ramp -> WCAG guard.

type Oklch = { L: number; C: number; h: number };

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}
function srgbToLinear(c: number) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c: number) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => Math.round(clamp01(v) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

export function hexToOklch(hex: string): Oklch {
  let [r, g, b] = hexToRgb(hex).map((v) => srgbToLinear(v / 255)) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), h: Math.atan2(B, A) };
}

export function oklchToHex({ L, C, h }: Oklch): string {
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l_ = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const r = linearToSrgb(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_);
  const g = linearToSrgb(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_);
  const b = linearToSrgb(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_);
  return rgbToHex(r, g, b);
}

function relLum(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => srgbToLinear(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrastRatio(a: string, b: string): number {
  const la = relLum(a), lb = relLum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Lower lightness of `fg` (in OKLCH) until it meets `target` contrast on `bg`.
function ensureContrast(fg: Oklch, bg: string, target: number): string {
  let c = { ...fg };
  for (let i = 0; i < 40; i++) {
    const hex = oklchToHex(c);
    if (contrastRatio(hex, bg) >= target) return hex;
    c = { ...c, L: Math.max(0, c.L - 0.02) };
  }
  return oklchToHex(c);
}

// Expand one seed into a full brand token set. Light editorial system: warm
// paper background, dark ink (AA), seed-derived accent (AA-large), plus dark
// and a small secondary palette for richer compositions.
export function expandPalette(seedHex: string): BrandColors {
  const seed = hexToOklch(seedHex);
  const H = seed.h;
  const cap = (c: number) => Math.min(seed.C, c);
  const bgHex = oklchToHex({ L: 0.95, C: cap(0.03), h: H });
  const colors: BrandColors = {
    background: bgHex,
    surface: oklchToHex({ L: 0.915, C: cap(0.045), h: H }),
    line: oklchToHex({ L: 0.89, C: cap(0.04), h: H }),
    primary: ensureContrast({ L: 0.22, C: cap(0.03), h: H }, bgHex, 4.5),
    secondary: ensureContrast({ L: 0.46, C: cap(0.04), h: H }, bgHex, 3),
    accent: ensureContrast({ L: seed.L, C: seed.C, h: H }, bgHex, 3),
    dark: oklchToHex({ L: 0.16, C: cap(0.02), h: H }),
    accentDark: oklchToHex({ L: 0.78, C: Math.min(seed.C * 0.6, 0.09), h: H }),
    eucalyptus: oklchToHex({ L: 0.62, C: 0.05, h: H + 0.7 }),
    dusty: oklchToHex({ L: 0.6, C: 0.04, h: H + Math.PI }),
    soot: oklchToHex({ L: 0.3, C: Math.min(seed.C * 1.1, 0.1), h: H - 0.35 }),
  };
  return colors;
}

// Hybrid guard: keep the caller's brand-aware colors (e.g. picked by the
// import subprocess for mood), fill any missing tokens from the accent seed,
// and deterministically guarantee WCAG contrast on text/accent. LLMs pick
// colors well but compute contrast unreliably — this is the math safety net.
export function guardPalette(input: Partial<BrandColors>): {
  colors: BrandColors;
  adjusted: string[];
} {
  const seed = input.accent || input.primary || "#697C70";
  const base = expandPalette(seed);
  const merged: BrandColors = {
    background: input.background || base.background,
    surface: input.surface || base.surface,
    line: input.line || base.line,
    primary: input.primary || base.primary,
    secondary: input.secondary || base.secondary,
    accent: input.accent || base.accent,
    dark: input.dark || base.dark,
    accentDark: input.accentDark || base.accentDark,
    eucalyptus: input.eucalyptus || base.eucalyptus,
    dusty: input.dusty || base.dusty,
    soot: input.soot || base.soot,
  };
  const bg = merged.background;
  const adjusted: string[] = [];
  const guard = (key: "primary" | "secondary" | "accent", target: number) => {
    if (contrastRatio(merged[key], bg) < target) {
      merged[key] = ensureContrast(hexToOklch(merged[key]), bg, target);
      adjusted.push(key);
    }
  };
  guard("primary", 4.5);
  guard("secondary", 3);
  guard("accent", 3);
  return { colors: merged, adjusted };
}
