import { describe, expect, it } from "vitest";
import { buildBrandGeneratePrompt } from "@/lib/brand-generate-prompt";
import { buildBrandImportPrompt } from "@/lib/brand-import-prompt";

describe("brand prompts", () => {
  it("uses the current app origin when importing a brand", () => {
    const prompt = buildBrandImportPrompt(
      "name: POGON",
      "http://127.0.0.1:3107"
    );
    expect(prompt).toContain("http://127.0.0.1:3107/api/brand");
    expect(prompt).not.toContain("http://localhost:3000/api/brand");
    expect(prompt).toContain("preferredPhrases");
    expect(prompt).toContain("sampleLines");
    expect(prompt).toContain("kit.character");
    expect(prompt).toContain("이미지 확인 필요");
  });

  it("uses the current app origin when generating a brand", () => {
    const prompt = buildBrandGeneratePrompt(
      {
        name: "POGON",
        business: "캐릭터 콘텐츠",
        target: "디자이너",
        mood: "차분함",
      },
      "/tmp/generated",
      "http://127.0.0.1:3107"
    );
    expect(prompt).toContain("http://127.0.0.1:3107/api/brand");
    expect(prompt).not.toContain("http://localhost:3000/api/brand");
    expect(prompt).toContain("headlinePatterns");
    expect(prompt).toContain("writingRules");
  });
});
