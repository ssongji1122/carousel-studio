import type { BrandVoice } from "@/types/brand";
import {
  sanitizeToolBrandReferenceList,
  sanitizeToolBrandReferences,
} from "@/lib/brand-text";

export const DEFAULT_STUDIO_LIKE_PHRASES = [
  "기준이 필요합니다",
  "먼저 세 가지를 봅니다",
  "자극보다 정돈",
  "작은 루틴으로 전환",
  "흐린 날의 기준",
  "저장합니다",
] as const;

export function formatBrandLanguageForPrompt(voice: BrandVoice): string {
  const language = voice.language;
  const preferred = sanitizeToolBrandReferenceList(language?.preferredPhrases);
  const avoid = sanitizeToolBrandReferenceList(language?.avoidPhrases);
  const patterns = sanitizeToolBrandReferenceList(language?.headlinePatterns);
  const rules = sanitizeToolBrandReferenceList(language?.writingRules);
  const samples = sanitizeToolBrandReferenceList(language?.sampleLines);

  return `## Brand language
- Ending: ${sanitizeToolBrandReferences(voice.ending)}
- Core words: ${formatList(sanitizeToolBrandReferenceList(voice.keywords))}
- Preferred phrases from source: ${formatList(preferred)}
- Avoid phrases for this brand: ${formatList(avoid)}
- Headline patterns: ${formatList(patterns)}
- Writing rules: ${formatList(rules)}
- Source-like sample lines: ${formatList(samples)}
- Default generic organizer phrases to avoid unless they appear in the active brand source: ${formatList([...DEFAULT_STUDIO_LIKE_PHRASES])}`;
}

export function voiceAvoidPhrases(voice: BrandVoice): string[] {
  return voice.language?.avoidPhrases ?? [];
}

function formatList(items: string[]): string {
  return items.length > 0 ? items.join(", ") : "none";
}
