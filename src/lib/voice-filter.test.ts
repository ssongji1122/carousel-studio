import { describe, it, expect } from "vitest";
import { checkVoice } from "@/lib/voice-filter";

const voice = { ending: "합니다체", banned: ["혁신적", "솔루션"], keywords: [] };

describe("checkVoice", () => {
  it("flags banned words", () => {
    const v = checkVoice("혁신적 솔루션", voice);
    expect(v.some((x) => x.kind === "banned")).toBe(true);
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
