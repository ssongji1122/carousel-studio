import type { AspectRatio, MediaRef, SlideRole } from "@/types/carousel";
import type { BrandConfig } from "@/types/brand";
import { renderSlideHtml } from "@/lib/render-template";
import { checkVoice, type VoiceViolation } from "@/lib/voice-filter";

export function buildSlideFromStructured(
  input: { role: SlideRole; headline: string; body: string; items?: string[]; media?: MediaRef | null },
  brand: BrandConfig,
  aspect: AspectRatio
): { html: string; violations: VoiceViolation[] } {
  const media = input.media ?? null;
  const items = Array.isArray(input.items) ? input.items : [];
  const html = renderSlideHtml({ ...input, items, media }, brand, aspect);
  const violations = [
    ...checkVoice(input.headline, brand.voice),
    ...(input.body ? checkVoice(input.body, brand.voice) : []),
    ...items.flatMap((it) => checkVoice(it, brand.voice)),
  ];
  return { html, violations };
}
