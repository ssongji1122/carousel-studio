import { describe, it, expect } from "vitest";
import { checkVoice } from "@/lib/voice-filter";

const voice = { ending: "합니다체", banned: ["혁신적", "솔루션"], keywords: [] };
const voiceWithLanguage = {
  ...voice,
  language: {
    preferredPhrases: ["브레인 포그"],
    avoidPhrases: ["기준이 필요합니다"],
    headlinePatterns: [],
    writingRules: [],
    sampleLines: [],
  },
};

describe("checkVoice", () => {
  it("flags banned words", () => {
    const v = checkVoice("혁신적 솔루션", voice);
    expect(v.some((x) => x.kind === "banned")).toBe(true);
  });
  it("flags brand-specific avoid phrases", () => {
    const v = checkVoice("머리가 흐린 날, 기준이 필요합니다", voiceWithLanguage);
    expect(v.some((x) => x.kind === "avoid")).toBe(true);
  });
  it("flags over 50 chars", () => {
    const v = checkVoice("가".repeat(51), voice);
    expect(v.some((x) => x.kind === "length")).toBe(true);
  });
  it("flags emoji", () => {
    const v = checkVoice("좋아요 " + "\u{1F389}", voice);
    expect(v.some((x) => x.kind === "emoji")).toBe(true);
  });
  it("passes clean text", () => {
    expect(checkVoice("아이디어를 풀어냅니다", voice)).toHaveLength(0);
  });
});
