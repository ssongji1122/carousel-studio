import { describe, it, expect } from "vitest";
import { STUDIO_SOLUTA_SEED } from "@/lib/brand-seed";

describe("STUDIO_SOLUTA_SEED", () => {
  it("maps studio.soluta tokens and moss accent", () => {
    expect(STUDIO_SOLUTA_SEED.colors.background).toBe("#F5F4F0");
    expect(STUDIO_SOLUTA_SEED.colors.accent).toBe("#697C70");
    expect(STUDIO_SOLUTA_SEED.fonts.heading).toBe("Cormorant Garamond");
    expect(STUDIO_SOLUTA_SEED.fonts.body).toBe("Pretendard Variable");
  });
  it("carries voice with banned words", () => {
    expect(STUDIO_SOLUTA_SEED.voice.ending).toBe("합니다체");
    expect(STUDIO_SOLUTA_SEED.voice.banned).toContain("혁신적");
    expect(STUDIO_SOLUTA_SEED.voice.banned).toContain("솔루션");
  });
});
