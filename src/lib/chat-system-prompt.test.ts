import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/lib/chat-system-prompt";
import { STUDIO_SOLUTA_SEED } from "@/lib/brand-seed";

function carousel(channel: "instagram" | "threads") {
  return { id: "c1", name: "t", aspectRatio: "4:5", channel, slides: [],
    referenceImages: [], chatSessionId: null, isTemplate: false, tags: [],
    createdAt: "", updatedAt: "" } as any;
}

describe("buildSystemPrompt chain", () => {
  it("includes the 5-step chain and structured-not-HTML rule", () => {
    const p = buildSystemPrompt(STUDIO_SOLUTA_SEED, carousel("instagram"));
    expect(p).toContain("인사이트");
    expect(p).toContain("앵글");
    expect(p).toContain("아웃라인");
    expect(p).toMatch(/headline/);
    expect(p).toMatch(/자유 HTML|HTML을 직접/);
  });
  it("lists banned words", () => {
    expect(buildSystemPrompt(STUDIO_SOLUTA_SEED, carousel("instagram"))).toContain("혁신적");
  });
  it("switches voice by channel", () => {
    expect(buildSystemPrompt(STUDIO_SOLUTA_SEED, carousel("instagram"))).toContain("합니다체");
    expect(buildSystemPrompt(STUDIO_SOLUTA_SEED, carousel("threads"))).toMatch(/캐주얼|구어체/);
  });
});
