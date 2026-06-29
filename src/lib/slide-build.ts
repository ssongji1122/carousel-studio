import type { AspectRatio, CharacterSheet, MediaRef, SlideRole, SlideStyle, SlideTone } from "@/types/carousel";
import type { BrandConfig } from "@/types/brand";
import { renderSlideHtml } from "@/lib/render-template";
import { checkVoice, type VoiceViolation } from "@/lib/voice-filter";

export function buildSlideFromStructured(
  input: {
    role: SlideRole;
    headline: string;
    body: string;
    items?: string[];
    media?: MediaRef | null;
    tone?: SlideTone;
    style?: SlideStyle;
  },
  brand: BrandConfig,
  aspect: AspectRatio,
  characterSheet?: CharacterSheet
): { html: string; violations: VoiceViolation[] } {
  const media = input.media ?? null;
  const items = Array.isArray(input.items) ? input.items : [];
  const html = renderSlideHtml({ ...input, items, media }, brand, aspect, characterSheet);
  const violations = [
    ...checkVoice(input.headline, brand.voice),
    ...(input.body ? checkVoice(input.body, brand.voice) : []),
    ...items.flatMap((it) => checkVoice(it, brand.voice)),
  ];
  return { html, violations };
}
