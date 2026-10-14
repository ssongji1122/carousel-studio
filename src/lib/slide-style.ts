import type { SlideStyle } from "@/types/carousel";

export const MIN_MEDIA_HEIGHT_PCT = 36;
export const MAX_MEDIA_HEIGHT_PCT = 72;
export const DEFAULT_MEDIA_HEIGHT_PCT = 56;
export const MIN_MEDIA_RADIUS = 0;
export const MAX_MEDIA_RADIUS = 40;
export const MIN_MEDIA_SCALE_PCT = 50;
export const MAX_MEDIA_SCALE_PCT = 180;
export const DEFAULT_MEDIA_SCALE_PCT = 100;
export const DEFAULT_MEDIA_OBJECT_POS = 50;
export const MIN_HEADLINE_FONT_SIZE = 28;
export const MAX_HEADLINE_FONT_SIZE = 140;
export const MIN_BODY_FONT_SIZE = 16;
export const MAX_BODY_FONT_SIZE = 80;
export const MIN_TEXT_OFFSET = -360;
export const MAX_TEXT_OFFSET = 360;

const COLOR_KEYS = [
  "headlineColor",
  "bodyColor",
  "itemColor",
  "backgroundColor",
  "accentColor",
] as const;

const FONT_KEYS = ["headingFont", "bodyFont"] as const;
const MEDIA_LAYOUTS = ["framed", "fullBleed"] as const;
const CHARACTER_SCENES = ["tired", "rollon", "patch", "relieved"] as const;
const CHARACTER_FRAME_ID = /^[a-z0-9][a-z0-9-_]{0,63}$/i;
const NUMBER_KEYS = [
  "headlineFontSize",
  "bodyFontSize",
  "itemFontSize",
  "headlineOffsetX",
  "headlineOffsetY",
  "bodyOffsetX",
  "bodyOffsetY",
  "itemOffsetX",
  "itemOffsetY",
  "mediaHeightPct",
  "mediaRadius",
  "mediaScalePct",
  "mediaObjectX",
  "mediaObjectY",
] as const;

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function normalizeSlideStyle(input: unknown, fallback?: SlideStyle): SlideStyle | undefined {
  if (input === undefined) return fallback;
  if (input === null) return undefined;
  if (!isRecord(input)) return fallback;

  const next: SlideStyle = { ...(fallback ?? {}) };

  for (const key of COLOR_KEYS) {
    const value = input[key];
    if (value === null) {
      delete next[key];
    } else if (typeof value === "string" && HEX_COLOR.test(value.trim())) {
      next[key] = normalizeHex(value);
    }
  }

  for (const key of FONT_KEYS) {
    const value = input[key];
    if (value === null) {
      delete next[key];
    } else if (typeof value === "string") {
      const font = value.trim();
      if (font.length > 0 && font.length <= 80) next[key] = font;
    }
  }

  const mediaLayout = input.mediaLayout;
  if (mediaLayout === null) {
    delete next.mediaLayout;
  } else if (typeof mediaLayout === "string" && MEDIA_LAYOUTS.includes(mediaLayout as typeof MEDIA_LAYOUTS[number])) {
    next.mediaLayout = mediaLayout as typeof MEDIA_LAYOUTS[number];
  }

  const characterScene = input.characterScene;
  if (characterScene === null) {
    delete next.characterScene;
  } else if (typeof characterScene === "string" && CHARACTER_SCENES.includes(characterScene as typeof CHARACTER_SCENES[number])) {
    next.characterScene = characterScene as typeof CHARACTER_SCENES[number];
  }

  const characterFrameId = input.characterFrameId;
  if (characterFrameId === null) {
    delete next.characterFrameId;
  } else if (typeof characterFrameId === "string") {
    const frameId = characterFrameId.trim();
    if (CHARACTER_FRAME_ID.test(frameId)) next.characterFrameId = frameId;
  }

  for (const key of NUMBER_KEYS) {
    const value = input[key];
    if (value === null) {
      delete next[key];
    } else if (typeof value === "number" && Number.isFinite(value)) {
      if (key === "mediaHeightPct") {
        next[key] = clamp(Math.round(value), MIN_MEDIA_HEIGHT_PCT, MAX_MEDIA_HEIGHT_PCT);
      } else if (key === "mediaScalePct") {
        next[key] = clamp(Math.round(value), MIN_MEDIA_SCALE_PCT, MAX_MEDIA_SCALE_PCT);
      } else if (key === "mediaObjectX" || key === "mediaObjectY") {
        next[key] = clamp(Math.round(value), 0, 100);
      } else if (key === "headlineFontSize") {
        next[key] = clamp(Math.round(value), MIN_HEADLINE_FONT_SIZE, MAX_HEADLINE_FONT_SIZE);
      } else if (key === "bodyFontSize" || key === "itemFontSize") {
        next[key] = clamp(Math.round(value), MIN_BODY_FONT_SIZE, MAX_BODY_FONT_SIZE);
      } else if (key.endsWith("OffsetX") || key.endsWith("OffsetY")) {
        next[key] = clamp(Math.round(value), MIN_TEXT_OFFSET, MAX_TEXT_OFFSET);
      } else {
        next[key] = clamp(Math.round(value), MIN_MEDIA_RADIUS, MAX_MEDIA_RADIUS);
      }
    }
  }

  return hasStyleValue(next) ? next : undefined;
}

export function hasStyleValue(style: SlideStyle): boolean {
  return (
    FONT_KEYS.some((key) => typeof style[key] === "string" && style[key]!.trim().length > 0) ||
    COLOR_KEYS.some((key) => typeof style[key] === "string" && HEX_COLOR.test(style[key]!)) ||
    NUMBER_KEYS.some((key) => typeof style[key] === "number" && Number.isFinite(style[key])) ||
    typeof style.mediaLayout === "string" ||
    typeof style.characterScene === "string" ||
    typeof style.characterFrameId === "string"
  );
}

function normalizeHex(value: string): string {
  const hex = value.trim();
  if (hex.length === 4) {
    const [, r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return hex.toUpperCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
