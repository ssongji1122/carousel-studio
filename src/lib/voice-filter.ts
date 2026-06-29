import type { BrandVoice } from "@/types/brand";
import { voiceAvoidPhrases } from "@/lib/brand-language";

export interface VoiceViolation {
  kind: "banned" | "avoid" | "length" | "emoji" | "exclaim";
  detail: string;
}

const EMOJI = /\p{Extended_Pictographic}/u;

export function checkVoice(
  text: string,
  voice: BrandVoice,
  maxLen = 50
): VoiceViolation[] {
  const out: VoiceViolation[] = [];
  for (const w of voice.banned) {
    if (w && text.includes(w)) out.push({ kind: "banned", detail: w });
  }
  for (const phrase of voiceAvoidPhrases(voice)) {
    if (phrase && text.includes(phrase)) out.push({ kind: "avoid", detail: phrase });
  }
  if ([...text].length > maxLen) out.push({ kind: "length", detail: `${[...text].length}/${maxLen}` });
  if (EMOJI.test(text)) out.push({ kind: "emoji", detail: "emoji found" });
  if ((text.match(/!/g)?.length ?? 0) > 1) out.push({ kind: "exclaim", detail: "느낌표 2개+" });
  return out;
}
